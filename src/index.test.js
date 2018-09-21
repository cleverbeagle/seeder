import seeder from './index';
import uuid from 'uuid/v4';

const Collection = {
  _driver: {
    mongo: {},
  },
  findOne: jest.fn(),
};

const user = {
  email: 'test@test.com',
  password: 'password',
  profile: {
    name: {
      first: 'Test',
      last: 'User',
    },
  },
  roles: ['user'],
};

const options = {
  environments: ['test', 'development', 'staging'],
  data: {
    static: [],
    dynamic: {},
  },
};

describe('@cleverbeagle/seeder', () => {
  const NODE_ENV_BEFORE_TEST = process.env;

  beforeEach(() => {
    jest.resetModules();

    global.Meteor = {
      isServer: true,
    };

    global.Accounts = {
      createUser: jest.fn(),
    };

    global.Roles = {
      addUsersToRoles: jest.fn(),
    };
  });

  afterEach(() => {
    process.env = NODE_ENV_BEFORE_TEST;
    global.Meteor.isServer = true;
  });

  it('throws an error if a collection is not passed', () => {
    expect(() => seeder(null, {})).toThrow();
  });

  it('throws an error if collection is not a valid MongoDB collection', () => {
    const collection = { ...Collection };
    delete collection._driver;
    expect(() => seeder(collection, options)).toThrow('Value passed for "collection" is not a valid MongoDB collection.');
  });

  it('throws an error if options are not passed', () => {
    expect(() => seeder(Collection, null)).toThrow();
  });

  it('throws an error if environments is not defined in options', () => {
    const testOptions = { ...options };
    delete testOptions.environments;
    expect(() => seeder(Collection, testOptions)).toThrow();
  });

  it('throws an error if run in a disallowed environment', () => {
    process.env = { ...NODE_ENV_BEFORE_TEST };
    delete process.env.NODE_ENV;

    expect(() => seeder(Collection, { environments: ['development', 'staging'] }))
      .toThrow('Seeding not allowed in this environment.');
  });

  it('throws an error if data is not defined in options', () => {
    const testOptions = { ...options };
    delete testOptions.data;
    expect(() => seeder(Collection, testOptions))
      .toThrow('Must pass a data object with static array, dynamic object, or both.');
  });

  it('throws an error if data.static or data.dynamic are not defined in options.data', () => {
    const testOptions = { ...options };
    testOptions.data = {};
    expect(() => seeder(Collection, testOptions))
      .toThrow('Must assign a static array or dynamic object to data in options.');
  });

  it('throws an error if used outside of Meteor server environment.', () => {
    global.Meteor.isServer = false;
    expect(() => seeder(Collection, options)).toThrow('Seeder is only intended to be run in a Meteor server environment.');
  });

  it('throws an error if data.static is not an array', () => {
    expect(() => seeder(Collection, { ...options, data: { static: {}, dynamic: {} } })).toThrow('Only an array can be passed to the static option.');
  });

  it('creates a user if collection is Meteor.users using static data', () => {
    Accounts.createUser.mockImplementation(() => 'userId');

    const testCollection = { ...Collection };
    testCollection._name = 'users';

    const roles = [...user.roles];

    const testOptions = { ...options };
    delete testOptions.data.dynamic;

    testOptions.data.static = [user];

    seeder(testCollection, testOptions);
    
    expect(Accounts.createUser).toHaveBeenCalledTimes(1);
    expect(Accounts.createUser).toHaveBeenCalledWith(user);
    expect(Roles.addUsersToRoles).toHaveBeenCalledWith('userId', roles);
  });

  it('creates a user with dependentData if collection is Meteor.users using static data', () => {
    Accounts.createUser.mockImplementation(() => 'userId');
    
    const testCollection = { ...Collection };
    
    testCollection._name = 'users';
    user.dependentData = jest.fn();

    const testOptions = { ...options };
    delete testOptions.data.dynamic;
    testOptions.data.static = [user];

    seeder(testCollection, testOptions);

    expect(user.dependentData).toHaveBeenCalledTimes(1);
    expect(user.dependentData).toHaveBeenCalledWith('userId');
  });

  it('does not create a user if the user already exists using static data', () => {
    Collection.findOne.mockImplementation(() => ({ _id: 'userId' }));
    const testCollection = { ...Collection };
    testCollection._name = 'users';

    const testOptions = { ...options };
    delete testOptions.data.dynamic;
    testOptions.data.static = [user];

    seeder(testCollection, testOptions);
    expect(Accounts.createUser).not.toHaveBeenCalled();
    expect(Roles.addUsersToRoles).not.toHaveBeenCalled();
  });
});

// class Collection {
//   constructor(name) {
//     this._name = name;
//     this._driver = { mongo: true };
//     this.documents = [];
//   }

//   insert(doc) {
//     const _id = uuid();
//     this.documents.push({ _id, ...doc });
//     return _id; // Fake a UUID. Not identical to Meteor's ID but good enough for tests.
//   }

//   findOne(query) {
//     return query;
//   }

//   find() {
//     this.count = () => this.documents.length;
//     return this;
//   }

//   remove() {
//     // Mocked as a full blow away as .remove() usage in package is only for wiping the collection.
//     this.documents = [];
//   }
// }

// const CoffeeShops = new Collection('CoffeeShops');
// const Coffee = new Collection('Coffee');

// const testCoffeeShops = [
//   { name: 'Wicker Park' },
//   { name: 'Gold Coast' },
//   { name: 'Rogers Park' },
// ];

// const testCoffees = [
//   { type: 'Guatemalan' },
//   { type: 'Columbian' },
//   { type: 'Kenyan' },
// ];

// beforeEach(() => {
//   global.Meteor = require('meteor/meteor');
//   global.process = { env: { NODE_ENV: 'development' } };
//   CoffeeShops.documents = [];
//   Coffee.documents = [];
// });

// test('it seeds the collection using static data', () => {
//   seeder(CoffeeShops, {
//     environments: ['development'],
//     data: testCoffeeShops,
//   });

//   expect(CoffeeShops.find().count()).toBe(3);
// });

// test('it seeds the collection using model data', () => {
//   seeder(CoffeeShops, {
//     environments: ['development'],
//     modelCount: 5,
//     model(index) {
//       return {
//         type: `Coffee Shop #${index + 1}`,
//       };
//     },
//   });

//   expect(CoffeeShops.find().count()).toBe(5);
// });

// test('it wipes the collection before seeding with static data', () => {
//   CoffeeShops.documents = testCoffeeShops;

//   seeder(CoffeeShops, {
//     environments: ['development'],
//     wipe: true,
//     modelCount: 5,
//     model(index) {
//       return {
//         type: `Coffee Shop #${index + 1}`,
//       };
//     },
//   });

//   expect(CoffeeShops.find().count()).toBe(5);
// });

// test('it blocks seeding if no environments are set in options', () => {
//   seeder(CoffeeShops, {
//     modelCount: 5,
//     model(index) {
//       return {
//         type: `Coffee Shop #${index + 1}`,
//       };
//     },
//   });

//   expect(CoffeeShops.find().count()).toBe(0);
// });

// test('it seeds using Faker data in the model', () => {
//   seeder(CoffeeShops, {
//     environments: ['development'],
//     modelCount: 5,
//     model(index, faker) {
//       return {
//         name: faker.lorem.words(5),
//       };
//     },
//   });

//   expect(CoffeeShops.find().count()).toBe(5);
// });

// test('it seeds the dependent collection with static data', () => {
//   seeder(CoffeeShops, {
//     environments: ['development'],
//     modelCount: 5,
//     model(index) {
//       return {
//         name: `Coffee Shop #${index + 1}`,
//         data({ name }) {
//           return {
//             collection: Coffee,
//             wipe: true,
//             environments: ['development'],
//             data: [
//               { location: name, type: 'Guatemalan' },
//               { location: name, type: 'Columbian' },
//             ],
//           };
//         },
//       };
//     },
//   });

//   expect(Coffee.find().count()).toBe(2);
// });

// test('it seeds the dependent collection with model data', () => {
//   seeder(CoffeeShops, {
//     environments: ['development'],
//     modelCount: 5,
//     model(index) {
//       return {
//         name: `Coffee Shop #${index + 1}`,
//         data({ name }) {
//           return {
//             collection: Coffee,
//             wipe: true,
//             environments: ['development'],
//             modelCount: 10,
//             model(index) {
//               return {
//                 location: name,
//                 type: `Coffee #${index + 1 }`,
//               };
//             },
//           };
//         },
//       };
//     },
//   });

//   expect(Coffee.find().count()).toBe(10);
// });

// test('it doesn\'t discriminate against return value on data function', () => {
//   const createCoffee = (location) => {
//     let i = 0;
//     while (i < 15) {
//       Coffee.insert({ location, type: `Coffee #${i + 1}` });
//       i++;
//     }
//   };

//   seeder(CoffeeShops, {
//     environments: ['development'],
//     modelCount: 5,
//     model(index) {
//       return {
//         name: `Coffee Shop #${index + 1}`,
//         data(coffeeShopId, faker, iteration) {
//           const name = `Coffee Shop #${iteration + 1}`;
//           createCoffee(name);
//           return {
//             collection: Coffee,
//             wipe: false,
//             noLimit: true,
//             environments: ['development'],
//             data: [
//               { location: name, type: 'Guatemalan' },
//               { location: name, type: 'Columbian' },
//             ],
//           };
//         },
//       };
//     },
//   });

//   expect(Coffee.find().count()).toBe(85);
// });
