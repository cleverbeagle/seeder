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
  constructor(collectionName) {
    this._driver = {
      mongo: {},
    };

    this._name = collectionName || 'collection';
    this._data = [];
  }

  find() {
    return {
      count: (() => this._data.length),
    };
  }

  findOne() {
    return this._data[0];
  }

  insert(data) {
    const documentId = uuid();
    this._data.push({ _id: documentId, ...data });
    return documentId;
  }

  remove() {
    this._data = [];
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
    global.Users = new _Collection('users');
    global.Documents = new _Collection('Documents');
    global.Comments = new _Collection('Comments');

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

  /* Validate options passed to seeder() */

  it('throws an error if a collection is not passed', () => {
    expect(() => seeder(null, {})).toThrow();
  });

  it('throws an error if collection is not a valid MongoDB collection', () => {
    delete Documents._driver.mongo;
    expect(() => seeder(Documents, getSeederOptions())).toThrow('Value passed for "collection" is not a valid MongoDB collection.');
  });

  it('throws an error if options are not passed', () => {
    expect(() => seeder(Documents, null)).toThrow();
  });

  it('throws an error if environments is not defined in options', () => {
    const testOptions = getSeederOptions();
    delete testOptions.environments;
    expect(() => seeder(Documents, testOptions)).toThrow();
  });

  it('throws an error if run in a disallowed environment', () => {
    const testOptions = getSeederOptions();
    console.warn = jest.fn();
    process.env = { ...NODE_ENV_BEFORE_TEST };
    delete process.env.NODE_ENV;
    
    seeder(Documents, testOptions);

    expect(console.warn.mock.calls[0][0]).toBe('[@cleverbeagle/seeder] Seeding not allowed in this environment. See http://cleverbeagle.com/packages/seeder/v2 for usage instructions.');
  });

  it('throws an error if data is not defined in options', () => {
    const testOptions = getSeederOptions();
    delete testOptions.data;
    expect(() => seeder(Documents, testOptions))
      .toThrow('Must pass a data object with static array, dynamic object, or both.');
  });

  it('throws an error if data.static or data.dynamic are not defined in options.data', () => {
    const testOptions = getSeederOptions();
    testOptions.data = {};
    expect(() => seeder(Documents, testOptions))
      .toThrow('Must assign a static array or dynamic object to data in options.');
  });

  it('throws an error if used outside of Meteor server environment.', () => {
    global.Meteor.isServer = false;
    expect(() => seeder(Documents, getSeederOptions())).toThrow('Seeder is only intended to be run in a Meteor server environment.');
  });

  /* Collection maintenance & precaution */

  it('wipes the collection if options.resetCollection is true', () => {
    Documents.insert({
      title: 'Document #1',
      body: 'This is the body of Document #1',
    });

    const testOptions = getSeederOptions();
    testOptions.resetCollection = true;

    seeder(Documents, testOptions);
    expect(Documents._data.length).toBe(0);
  });

  it('does not seed the collection if options.seedIfExistingData is false', () => {
    Documents.insert({
      title: 'Document #1',
      body: 'This is the body of Document #1',
    });

    const testOptions = getSeederOptions();
    testOptions.seedIfExistingData = false;
    testOptions.data.static = [{
      title: 'Document #2',
      body: 'This is the body of Document #2',
    }];

    seeder(Documents, testOptions);

    expect(Documents._data.length).toBe(1);
  });

  it('does seed the collection if options.seedIfExistingData is true', () => {
    Documents.insert({
      title: 'Document #1',
      body: 'This is the body of Document #1',
    });

    const testOptions = getSeederOptions();
    testOptions.seedIfExistingData = true;
    testOptions.data.static = [{
      title: 'Document #2',
      body: 'This is the body of Document #2',
    }];

    seeder(Documents, testOptions);

    expect(Documents._data.length).toBe(2);
  });

  /* User creation */

  it('creates a user if collection is Meteor.users using static data', () => {
    Accounts.createUser.mockImplementation(() => 'userId');

    const roles = [...user.roles];

    const testOptions = getSeederOptions();
    delete testOptions.data.dynamic;

    testOptions.data.static = [user];

    seeder(Users, testOptions);
    
    expect(Accounts.createUser).toHaveBeenCalledTimes(1);
    expect(Accounts.createUser).toHaveBeenCalledWith(user);
    expect(Roles.addUsersToRoles).toHaveBeenCalledWith('userId', roles);
  });

  it('creates a user with dependentData if collection is Meteor.users using static data', () => {
    Accounts.createUser.mockImplementation(() => 'userId');

    const testUser = { ...user };
    testUser.dependentData = jest.fn();

    const testOptions = getSeederOptions();
    delete testOptions.data.dynamic;
    testOptions.data.static = [testUser];

    seeder(Users, testOptions);

    expect(testUser.dependentData).toHaveBeenCalledTimes(1);
    expect(testUser.dependentData).toHaveBeenCalledWith('userId');
  });

  it('does not create a user if the user already exist using static data', () => {
    Users.insert({ _id: 'userId' });

    const testOptions = getSeederOptions();
    delete testOptions.data.dynamic;
    testOptions.data.static = [user];

    seeder(Users, testOptions);

    expect(Accounts.createUser).not.toHaveBeenCalled();
    expect(Roles.addUsersToRoles).not.toHaveBeenCalled();
  });

  it('creates users if collection is Meteor.users using dynamic data', () => {
    Accounts.createUser.mockImplementation(() => 'userId');

    const testOptions = getSeederOptions();
    delete testOptions.data.static;

    testOptions.data.dynamic = {
      count: 5,
      seed(userNumber, faker) {
        return {
          email: `user+${userNumber}@test.com`,
          password: 'password',
          profile: {
            name: {
              first: faker.name.firstName(),
              last: faker.name.lastName(),
            },
          },
          roles: ['user'],
        };
      },
    };

    seeder(Users, testOptions);
    
    expect(Accounts.createUser).toHaveBeenCalledTimes(5);
    expect(Roles.addUsersToRoles).toHaveBeenCalledTimes(5);
  });

  it('creates users with dependentData if collection is Meteor.users using dynamic data', () => {
    Accounts.createUser.mockImplementation(() => 'userId');

    const testOptions = getSeederOptions();
    delete testOptions.data.static;
    testOptions.data.dynamic = {
      count: 5,
      seed(userNumber, faker) {
        return {
          email: `user+${userNumber}@test.com`,
          password: 'password',
          profile: {
            name: {
              first: faker.name.firstName(),
              last: faker.name.lastName(),
            },
          },
          roles: ['user'],
          dependentData(userId) {
            seeder(Documents, {
              environments: ['test', 'development', 'staging'],
              seedIfExistingData: true,
              data: {
                dynamic: {
                  count: 5,
                  seed(iteration) {
                    return {
                      title: `Document #${iteration + 1}`,
                      body: `This is the body of Document #${iteration + 1}`,
                    };
                  },
                },
              },
            });
          },
        };
      },
    };

    seeder(Users, testOptions);

    expect(Accounts.createUser).toHaveBeenCalledTimes(5);
    expect(Documents._data.length).toEqual(25);
  });

  it('does not create users if they already exist using dynamic data', () => {
    Accounts.createUser.mockImplementation(() => 'userId');

    // NOTE: Insert fake users.
    let fakeUserCount = 0;

    while (fakeUserCount < 5) {
      Users.insert({
        email: `user+${fakeUserCount}@test.com`,
        password: 'password',
        profile: {
          name: {
            first: 'Fake',
            last: 'User',
          },
        },
        roles: ['user'],
      });

      fakeUserCount += 1;
    }

    const testOptions = getSeederOptions();
    delete testOptions.data.static;

    testOptions.data.dynamic = {
      count: 5,
      seed(userNumber, faker) {
        return {
          email: `user+${userNumber}@test.com`,
          password: 'password',
          profile: {
            name: {
              first: faker.name.firstName(),
              last: faker.name.lastName(),
            },
          },
          roles: ['user'],
        };
      },
    };

    seeder(Users, testOptions);
    
    expect(Accounts.createUser).not.toHaveBeenCalled();
    expect(Roles.addUsersToRoles).not.toHaveBeenCalled();
  });

  /* Static data creation */

  it('throws an error if data.static is not an array', () => {
    const testOptions = getSeederOptions();
    testOptions.data = { static: {}, dynamic: {} };
    expect(() => seeder(Documents, testOptions)).toThrow('Only an array can be passed to the static option.');
  });

  it('creates item in collection using static data', () => {
    const testOptions = getSeederOptions();
    delete testOptions.data.dynamic;
    testOptions.data.static = [{
      title: `Document #1`,
      body: `This is the body of Document #1`,
    }, {
      title: `Document #2`,
      body: `This is the body of Document #2`,
    }];
    seeder(Documents, testOptions);
    expect(Documents._data.length).toBe(2);
  });

  it('creates item in collection using static data with dependentData', () => {
    const testOptions = getSeederOptions();
    delete testOptions.data.dynamic;
    testOptions.data.static = [{
      title: `Document #1`,
      body: `This is the body of Document #1`,
      dependentData(documentId) {
        seeder(Comments, {
          environments: ['test', 'development', 'staging'],
          data: {
            dynamic: {
              count: 5,
              seedIfExistingData: true,
              seed(iteration) {
                return {
                  documentId,
                  comment: `This is comment #${iteration}.`,
                };
              }
            },
          }
        });
      },
    }, {
      title: `Document #2`,
      body: `This is the body of Document #2`,
      dependentData(documentId) {
        seeder(Comments, {
          seedIfExistingData: true,
          environments: ['test', 'development', 'staging'],
          data: {
            dynamic: {
              count: 5,
              seed(iteration) {
                return {
                  documentId,
                  comment: `This is comment #${iteration}.`,
                };
              }
            },
          }
        });
      },
    }];
    seeder(Documents, testOptions);
    expect(Documents._data.length).toBe(2);
    expect(Comments._data.length).toBe(10);
  });

  /* Dynamic data creation */

  it('throws an error if dynamic option is not an object', () => {
    const testOptions = getSeederOptions();
    testOptions.data = { dynamic: [] };
    expect(() => seeder(Documents, testOptions)).toThrow('Only an object can be passed to the dynamic option.');
  });

  it('throws an error if count is not defined as number on dynamic option', () => {
    const testOptions = getSeederOptions();
    delete testOptions.data.static;
    testOptions.data.dynamic.count = 'not a number';
    expect(() => seeder(Documents, testOptions)).toThrow('count property defined on the object passed to the dynamic option must be a number.');
  });

  it('throws an error if seed is not defined as function on dynamic option', () => {
    const testOptions = getSeederOptions();
    delete testOptions.data.static;
    testOptions.data.dynamic.seed = 'not a function';
    expect(() => seeder(Documents, testOptions)).toThrow('seed property defined on the object passed to the dynamic option must be a function.');
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
    seeder(Documents, testOptions);
    expect(Documents._data.length).toBe(10);
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
            seeder(Comments, {
              seedIfExistingData: true,
              environments: ['test', 'development', 'staging'],
              data: {
                dynamic: {
                  count: 5,
                  seed(commentNumber) {
                    return {
                      documentId,
                      comment: `This is Comment #${commentNumber} on Document ${documentId}`,
                    };
                  },
                },
              },
            });
          },
        };
      },
    };
    seeder(Documents, testOptions);
    expect(Documents._data.length).toBe(10);
    expect(Comments._data.length).toBe(50);
  });
});
