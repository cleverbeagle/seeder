import seeder from './index';
import uuid from 'uuid/v4';

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

// NOTE: Write this as a class to give each test its own collection
// instance to mess with.
class _Collection {
  constructor() {
    this._driver = {
      mongo: {},
    };

    this._data = [];
  }

  findOne() {
    return this._data[0];
  }

  insert(data) {
    const documentId = uuid();
    this._data.push({ _id: documentId, ...data });
    return documentId;
  }
}

// NOTE: Write this as a function to avoid options object being overwritten
// or corrupted by sibling tests.
const getSeederOptions = () => ({
  environments: ['test', 'development', 'staging'],
  data: {
    static: [],
    dynamic: {},
  },
});

describe('@cleverbeagle/seeder', () => {
  const NODE_ENV_BEFORE_TEST = process.env;

  beforeEach(() => {
    jest.resetModules();

    // NOTE: Give each test its own collection.
    global.Collection = new _Collection();
    global.DependentCollection = new _Collection();

    // console.log(global.Collection);

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
    delete Collection._driver.mongo;
    expect(() => seeder(Collection, getSeederOptions())).toThrow('Value passed for "collection" is not a valid MongoDB collection.');
  });

  it('throws an error if options are not passed', () => {
    expect(() => seeder(Collection, null)).toThrow();
  });

  it('throws an error if environments is not defined in options', () => {
    const testOptions = getSeederOptions();
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
    const testOptions = getSeederOptions();
    delete testOptions.data;
    expect(() => seeder(Collection, testOptions))
      .toThrow('Must pass a data object with static array, dynamic object, or both.');
  });

  it('throws an error if data.static or data.dynamic are not defined in options.data', () => {
    const testOptions = getSeederOptions();
    testOptions.data = {};
    expect(() => seeder(Collection, testOptions))
      .toThrow('Must assign a static array or dynamic object to data in options.');
  });

  it('throws an error if used outside of Meteor server environment.', () => {
    global.Meteor.isServer = false;
    expect(() => seeder(Collection, getSeederOptions())).toThrow('Seeder is only intended to be run in a Meteor server environment.');
  });

  it('throws an error if data.static is not an array', () => {
    const testOptions = getSeederOptions();
    testOptions.data = { static: {}, dynamic: {} };
    expect(() => seeder(Collection, testOptions)).toThrow('Only an array can be passed to the static option.');
  });

  it('creates a user if collection is Meteor.users using static data', () => {
    Accounts.createUser.mockImplementation(() => 'userId');

    Collection._name = 'users';

    const roles = [...user.roles];

    const testOptions = getSeederOptions();
    delete testOptions.data.dynamic;

    testOptions.data.static = [user];

    seeder(Collection, testOptions);
    
    expect(Accounts.createUser).toHaveBeenCalledTimes(1);
    expect(Accounts.createUser).toHaveBeenCalledWith(user);
    expect(Roles.addUsersToRoles).toHaveBeenCalledWith('userId', roles);
  });

  it('creates a user with dependentData if collection is Meteor.users using static data', () => {
    Accounts.createUser.mockImplementation(() => 'userId');

    Collection._name = 'users';
    user.dependentData = jest.fn();

    const testOptions = getSeederOptions();
    delete testOptions.data.dynamic;
    testOptions.data.static = [user];

    seeder(Collection, testOptions);

    expect(user.dependentData).toHaveBeenCalledTimes(1);
    expect(user.dependentData).toHaveBeenCalledWith('userId');
  });

  it('does not create a user if the user already exists using static data', () => {
    Collection._name = 'users';
    Collection.insert({ _id: 'userId' });

    const testOptions = getSeederOptions();
    delete testOptions.data.dynamic;
    testOptions.data.static = [user];

    seeder(Collection, testOptions);

    expect(Accounts.createUser).not.toHaveBeenCalled();
    expect(Roles.addUsersToRoles).not.toHaveBeenCalled();
  });

  it('throws an error if dynamic option is not an object', () => {
    const testOptions = getSeederOptions();
    testOptions.data = { dynamic: [] };
    expect(() => seeder(Collection, testOptions)).toThrow('Only an object can be passed to the dynamic option.');
  });

  it('throws an error if count is not defined as number on dynamic option', () => {
    const testOptions = getSeederOptions();
    delete testOptions.data.static;
    testOptions.data.dynamic.count = 'not a number';
    expect(() => seeder(Collection, testOptions)).toThrow('count property defined on the object passed to the dynamic option must be a number.');
  });

  it('throws an error if seed is not defined as function on dynamic option', () => {
    const testOptions = getSeederOptions();
    delete testOptions.data.static;
    testOptions.data.dynamic.seed = 'not a function';
    expect(() => seeder(Collection, testOptions)).toThrow('seed property defined on the object passed to the dynamic option must be a function.');
  });

  it('creates item in collection using dynamic data', () => {
    const testOptions = getSeederOptions();
    delete testOptions.data.static;
    testOptions.data.dynamic = {
      count: 10,
      seed(iteration) {
        return {
          title: `Document #${iteration + 1}`,
          body: `This is the body of Document #${iteration + 1}`,
        };
      },
    };
    seeder(Collection, testOptions);
    expect(Collection._data.length).toBe(10);
  });

  it('creates item in collection using dynamic data with dependent data', () => {
    const testOptions = getSeederOptions();
    delete testOptions.data.static;
    testOptions.data.dynamic = {
      count: 10,
      seed(iteration) {
        return {
          title: `Document #${iteration + 1}`,
          body: `This is the body of Document #${iteration + 1}`,
          dependentData(documentId) {
            seeder(DependentCollection, {
              environments: ['test', 'development', 'staging'],
              data: {
                dynamic: {
                  count: 5,
                  seed(anotherCollectionIteration) {
                    return {
                      test: `Nested data #${anotherCollectionIteration} under Document ${documentId}`,
                    };
                  },
                },
              },
            });
          },
        };
      },
    };
    seeder(Collection, testOptions);
    expect(Collection._data.length).toBe(10);
    expect(DependentCollection._data.length).toBe(50);
  });
});
