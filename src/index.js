import faker from 'faker';

class Seeder {
  constructor(collection, options) {
    if (!collection || !options) {
      throw new Error('Please supply a MongoDB collection instance to seed and options for seeding. Usage: seeder(collectionName, options).');
    }

    this.collection = this.validateCollection(collection);
    this.options = options;

    if (Meteor && Meteor.isServer) {
      this.seed();
    } else {
      throw new Error('Seeder is only intended to be run in a Meteor server environment. See http://packages.cleverbeagle.com/seeder/usage for more.');
    }
  }

  validateCollection(collection) {
    if (!collection._driver.mongo) throw new Error('Value passed for "collection" is not a MongoDB collection.');
    return collection;
  }

  seed() {
    const { data, model } = this.options;
    if (data && model) throw new Error('Please choose to seed from either a data array or a model.');
    this.sow(data || model);
  }

  sow(data) {
    if (this.options.wipe) this.collection.remove({});

    const isDataArray = data instanceof Array;
    const loopLength = isDataArray ? data.length : this.options.min;
    const hasData = this.checkForExistingData();
    const collectionName = this.collection._name;
    const isUsers = collectionName === 'users';
    const environmentAllowed = this.environmentAllowed();

    if (!hasData && environmentAllowed) {
      for (let i = 0; i < loopLength; i++) {
        const value = isDataArray ? data[i] : data(i, faker);

        try {
          if (isUsers) {
            this.createUser(value);
          } else {
            this.collection.insert(value);
          }
        } catch (exception) {
          console.warn(exception);
        }
      }
    }
  }

  checkForExistingData() {
    let existingCount = this.collection.find().count();
    return this.options.min ? (existingCount >= this.options.min) : (existingCount > 0);
  }

  environmentAllowed() {
    const environments = this.options.environments;
    if (environments) return environments.indexOf(process.env.NODE_ENV) > -1;
    return false;
  }

  createUser(user) {
    const userToCreate = user;
    const isExistingUser = this.collection.findOne({ 'emails.address': userToCreate.email });
    if (!isExistingUser) {
      const roles = userToCreate.roles;
      if (roles) delete userToCreate.roles;
      const userId = Accounts.createUser(userToCreate);
      if (roles && Roles !== 'undefined') Roles.addUsersToRoles(userId, roles);
    }
  }
}

export default (collection, options) => {
  return new Seeder(collection, options);
}
