import faker from 'faker';

class Seeder {
  constructor(collection, options) {
    if (!collection) this.throwSeederError('Please supply a MongoDB collection instance to seed.');
    if (!this.isValidMongoDBCollection(collection)) this.throwSeederError('Value passed for "collection" is not a valid MongoDB collection.');

    if (!options) this.throwSeederError('Please supply options for seeding.');
    if (!options.environments) this.throwSeederError('Must pass an array of environments where seeding is allowed.');

    if (!this.environmentAllowed(options.environments)) this.throwSeederError('Seeding not allowed in this environment.');;

    if (!options.data) this.throwSeederError('Must pass a data object with static array, dynamic object, or both.');
    if (options.data && !options.data.static && !options.data.dynamic) this.throwSeederError('Must assign a static array or dynamic object to data in options.');
    
    // NOTE: If collection and options are valid, set them on the instance for access inside of other methods.
    this.collection = collection;
    this.options = options;

    if (Meteor && Meteor.isServer) {
      this.seedCollection();
    } else {
      this.throwSeederError('Seeder is only intended to be run in a Meteor server environment.');
    }
  }

  isValidMongoDBCollection(collection) {
    return !!(collection && collection._driver && collection._driver.mongo); // eslint-disable-line
  }

  throwSeederError(message) {
    throw new Error(`[@cleverbeagle/seeder] ${message} See http://cleverbeagle.com/packages/seeder/usage for usage instructions.`);
  }

  environmentAllowed(environments) {
    return environments.indexOf(process.env.NODE_ENV) > -1;
  }

  seedCollection() {
    // console.log(this.options);
    if (this.options.data.static) this.seedCollectionWithStaticData(this.options.data.static);
    if (this.options.dynamic) this.seedCollectionWithDynamicData(this.options.dynamic);
  }

  seedCollectionWithStaticData(staticData) {
    if (!(staticData instanceof Array)) {
      this.throwSeederError('Only an array can be passed to the static option.');
    }

    const isUsersCollection = this.collection._name === 'users';

    staticData.forEach((staticDataItem) => {
      if (isUsersCollection) {
        this.createUser(staticDataItem);
      } else {
        this.createObjectInCollection(staticDataItem);
      }
    });
  }

  createUser(user) {
    const userToCreate = user;

    // NOTE: Check if email address or username (if applicable) passed already exists in Meteor.users.
    const isExistingUserConditions = [{ 'emails.address': userToCreate.email }];
    if (userToCreate.username) isExistingUserConditions.push({ username: userToCreate.username });
    const isExistingUser = this.collection.findOne({ $or: isExistingUserConditions });

    if (!isExistingUser) {
      // NOTE: Extract roles array so we can pass userToCreate directly to Accounts.createUser.
      const roles = userToCreate.roles;
      if (roles) delete userToCreate.roles;

      const userId = Accounts.createUser(userToCreate);
      
      // NOTE: If a roles array is passed and the global Roles (from the alanning:roles package) is present, assign roles to user.
      if (roles && Roles !== 'undefined') Roles.addUsersToRoles(userId, roles);

      // NOTE: If the user was passed with a dependentData method, call the method passing the user's _id.
      if (userToCreate.dependentData && typeof userToCreate.dependentData === 'function') userToCreate.dependentData(userId);
    }
  }

  seedCollectionWithDynamicData(dynamicData) {
    if (typeof dynamicData !== 'object') this.throwSeederError('Only an object can be passed to the dynamic option.');
    if (dynamicData && !dynamicData.count) this.throwSeederError('A count property with the number of objects to create must be defined on the object passed to the dynamic option.');
    if (dynamicData && dynamicData.count && typeof dynamicData.count !== 'number') this.throwSeederError('Count property defined on the object passed to the dynamic option must be a number.');
  }

  // sow(data, collection, options) {
  //   if (options.wipe) collection.remove({});
  //   const isDataArray = data instanceof Array;
  //   const loopLength = isDataArray ? data.length : options.modelCount;
  //   const hasData = options.noLimit ? false : this.checkForExistingData(collection, options.modelCount);
  //   const collectionName = collection._name;
  //   const isUsers = collectionName === 'users';
  //   const environmentAllowed = this.environmentAllowed(options.environments);

  //   if (!hasData && environmentAllowed) {
  //     for (let i = 0; i < loopLength; i++) {
  //       const value = isDataArray ? data[i] : data(i, faker);

  //       try {
  //         if (isUsers) {
  //           this.createUser(collection, value, i); // Pass i for use with dependents.
  //         } else {
  //           this.createData(collection, value, i); // Pass i for use with dependents.
  //         }
  //       } catch (exception) {
  //         console.warn(exception);
  //       }
  //     }
  //   }
  // }

  checkForExistingData(collection, modelCount) {
    let existingCount = collection.find().count();
    return modelCount ? (existingCount >= modelCount) : (existingCount > 0);
  }

  createData(collection, value, iteration) {
    const data = value.data; // Cache this as a variable before it gets sanitized by the insert.
    const dataId = collection.insert(value);
    if (data) this.seedDependent(dataId, data, iteration);
  }

  seedDependent(dataId, data, iteration) {
    const dependent = data(dataId, faker, iteration);
    if (dependent && dependent.collection) this.seed(this.validateCollection(dependent.collection), dependent);
  }
}

export default (collection, options) => {
  return new Seeder(collection, options);
}
