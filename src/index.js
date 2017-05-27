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
      throw new Error('Seeder is only intended to be run in a Meteor server environment.');
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
    // Wipe any existing data first.
    if (this.options.wipe) this.collection.remove({});

    const isDataArray = data instanceof Array;
    const loopLength = isDataArray ? data.length : this.options.min;
    const hasData = this.checkForExistingData();
    const collectionName = this.collection._name;
    const isUsers = collectionName === 'users';
    const environmentAllowed = this.environmentAllowed();

    if (!hasData && environmentAllowed) {
      const errors = [];

      for (let i = 0; i < loopLength; i++) {
        const value = isDataArray ? data[i] : data(i);

        try {
          if (isUsers) {
            this.createUser(value);
          } else {
            this.collection.insert(value);
          }
        } catch (exception) {
          errors.push({ exception });
        }
      }

      throw new Error(`The following errors occurred while seeding "${collectionName}": \n\n ${errors}`);
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
    const roles = user.roles;
    const isExistingUser = this.collection.findOne({ 'emails.address': user.email });
    if (!isExistingUser) {
      delete user.roles;
      const userId = Accounts.createUser(user);
      if (roles && Roles !== 'undefined') Roles.addUsersToRoles(userId, user.roles);
    }
  }
}

export default (collection, options) => new Seeder(collection, options);
