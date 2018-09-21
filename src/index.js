import faker from 'faker/locale/en';

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
    this.options = {
      resetCollection: false,
      seedIfExistingData: false,
      ...options,
    };

    if (Meteor && Meteor.isServer) {
      if (this.options.resetCollection) this.resetCollection();
      this.seedCollection();
    } else {
      this.throwSeederError('Seeder is only intended to be run in a Meteor server environment.');
    }
  }

  isValidMongoDBCollection(collection) {
    return !!(collection && collection._driver && collection._driver.mongo); // eslint-disable-line
  }

  throwSeederError(message) {
    throw new Error(`[@cleverbeagle/seeder] ${message} See http://cleverbeagle.com/packages/seeder/v2 for usage instructions.`);
  }

  environmentAllowed(environments) {
    return environments.indexOf(process.env.NODE_ENV) > -1;
  }

  resetCollection() {
    this.collection.remove({});
  }

  seedCollection() {
    // NOTE: If options.seedIfExisting data is FALSE and the collection has data, stop immediately.
    if (!this.options.seedIfExistingData && this.collectionHasExistingData(this.collection)) return;
    if (this.options.data.static) this.seedCollectionWithStaticData(this.options.data.static);
    if (this.options.data.dynamic) this.seedCollectionWithDynamicData(this.options.data.dynamic);
  }

  collectionHasExistingData(collection, modelCount) {
    let existingCount = this.collection.find().count();
    return modelCount ? (existingCount >= modelCount) : (existingCount > 0);
  }

  seedCollectionWithStaticData(staticData) {
    if (!(staticData instanceof Array)) {
      this.throwSeederError('Only an array can be passed to the static option.');
    }

    staticData.forEach((staticDataItem) => {
      this.createDataItem(staticDataItem);
    });
  }

  isUsersCollection() {
    return this.collection._name === 'users';
  }

  createDataItem(dataItem) {
    let idOfItemCreated;

    if (this.isUsersCollection()) {
      idOfItemCreated = this.createUser(dataItem);
    } else {
      idOfItemCreated = this.collection.insert(dataItem);
    }

    if (dataItem && dataItem.dependentData) {
      dataItem.dependentData(idOfItemCreated);  
    }
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

      return userId;
    }
  }

  seedCollectionWithDynamicData(dynamicData) {
    // NOTE: Checking if dynamicData is an actual object (not an array or other value).
    if (Object.prototype.toString.call(dynamicData) !== '[object Object]') this.throwSeederError('Only an object can be passed to the dynamic option.');
    if (dynamicData && dynamicData.count && typeof dynamicData.count !== 'number') this.throwSeederError('count property defined on the object passed to the dynamic option must be a number.');
    if (dynamicData && dynamicData.seed && typeof dynamicData.seed !== 'function') this.throwSeederError('seed property defined on the object passed to the dynamic option must be a function.');

    for (let currentItemIndex = 0; currentItemIndex < dynamicData.count; currentItemIndex += 1) {
      const itemToCreate = dynamicData.seed(currentItemIndex, faker);
      this.createDataItem(itemToCreate);
    }
  }
}

export default (collection, options) => {
  return new Seeder(collection, options);
}
