import faker from 'faker';

class Seeder {
  constructor(collection, options) {
    if (!collection || !options) {
      throw new Error('Please supply a MongoDB collection instance to seed and options for seeding. Usage: seeder(collectionName, options).');
    }

    if (Meteor && Meteor.isServer) {
      this.seed(this.validateCollection(collection), options);
    } else {
      throw new Error('Seeder is only intended to be run in a Meteor server environment. See http://cleverbeagle.com/packages/seeder/usage for usage instructions.');
    }
  }

  validateCollection(collection) {
    if (!collection._driver.mongo) throw new Error('Value passed for "collection" is not a MongoDB collection.');
    return collection;
  }

  seed(collection, options) {
    const { data, model } = options;
    if (data) this.sow(data, collection, options);
    if (model) this.sow(model, collection, options);
  }

  sow(data, collection, options) {
    if (options.wipe) collection.remove({});
    const isDataArray = data instanceof Array;
    const loopLength = isDataArray ? data.length : options.modelCount;
    const hasData = options.noLimit ? false : this.checkForExistingData(collection, options.modelCount);
    const collectionName = collection._name;
    const isUsers = collectionName === 'users';
    const environmentAllowed = this.environmentAllowed(options.environments);

    if (!hasData && environmentAllowed) {
      for (let i = 0; i < loopLength; i++) {
        const value = isDataArray ? data[i] : data(i, faker);

        try {
          if (isUsers) {
            this.createUser(collection, value);
          } else {
            this.createData(collection, value);
          }
        } catch (exception) {
          console.warn(exception);
        }
      }
    }
  }

  checkForExistingData(collection, modelCount) {
    let existingCount = collection.find().count();
    return modelCount ? (existingCount >= modelCount) : (existingCount > 0);
  }

  environmentAllowed(environments) {
    if (environments) return environments.indexOf(process.env.NODE_ENV) > -1;
    return false;
  }

  createUser(collection, user) {
    const userToCreate = user;
    const isExistingUser = collection.findOne({ 'emails.address': userToCreate.email });
    if (!isExistingUser) {
      const roles = userToCreate.roles;
      if (roles) delete userToCreate.roles;
      const userId = Accounts.createUser(userToCreate);
      if (roles && Roles !== 'undefined') Roles.addUsersToRoles(userId, roles);
      if (userToCreate.data) this.seedDependent(userId, userToCreate.data);
    }
  }

  createData(collection, value) {
    const dataId = collection.insert(value);
    if (value.data) this.seedDependent(dataId, value.data);
  }

  seedDependent(dataId, data) {
    const dependent = data(dataId);
    this.seed(this.validateCollection(dependent.collection), dependent);
  }
}

export default (collection, options) => {
  return new Seeder(collection, options);
}
