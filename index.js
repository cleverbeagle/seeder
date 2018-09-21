'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _faker = require('faker');

var _faker2 = _interopRequireDefault(_faker);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Seeder = function () {
  function Seeder(collection, options) {
    _classCallCheck(this, Seeder);

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

  _createClass(Seeder, [{
    key: 'isValidMongoDBCollection',
    value: function isValidMongoDBCollection(collection) {
      return !!(collection && collection._driver && collection._driver.mongo); // eslint-disable-line
    }
  }, {
    key: 'throwSeederError',
    value: function throwSeederError(message) {
      throw new Error('[@cleverbeagle/seeder] ' + message + ' See http://cleverbeagle.com/packages/seeder/usage for usage instructions.');
    }
  }, {
    key: 'environmentAllowed',
    value: function environmentAllowed(environments) {
      return environments.indexOf(process.env.NODE_ENV) > -1;
    }
  }, {
    key: 'seedCollection',
    value: function seedCollection() {
      // console.log(this.options);
      if (this.options.data.static) this.seedCollectionWithStaticData(this.options.data.static);
      if (this.options.dynamic) this.seedCollectionWithDynamicData(this.options.dynamic);
    }
  }, {
    key: 'seedCollectionWithStaticData',
    value: function seedCollectionWithStaticData(staticData) {
      var _this = this;

      if (!(staticData instanceof Array)) {
        this.throwSeederError('Only an array can be passed to the static option.');
      }

      var isUsersCollection = this.collection._name === 'users';

      staticData.forEach(function (staticDataItem) {
        if (isUsersCollection) {
          _this.createUser(staticDataItem);
        } else {
          _this.createObjectInCollection(staticDataItem);
        }
      });
    }
  }, {
    key: 'createUser',
    value: function createUser(user) {
      var userToCreate = user;

      // NOTE: Check if email address or username (if applicable) passed already exists in Meteor.users.
      var isExistingUserConditions = [{ 'emails.address': userToCreate.email }];
      if (userToCreate.username) isExistingUserConditions.push({ username: userToCreate.username });
      var isExistingUser = this.collection.findOne({ $or: isExistingUserConditions });

      if (!isExistingUser) {
        // NOTE: Extract roles array so we can pass userToCreate directly to Accounts.createUser.
        var roles = userToCreate.roles;
        if (roles) delete userToCreate.roles;

        var userId = Accounts.createUser(userToCreate);

        // NOTE: If a roles array is passed and the global Roles (from the alanning:roles package) is present, assign roles to user.
        if (roles && Roles !== 'undefined') Roles.addUsersToRoles(userId, roles);

        // NOTE: If the user was passed with a dependentData method, call the method passing the user's _id.
        if (userToCreate.dependentData && typeof userToCreate.dependentData === 'function') userToCreate.dependentData(userId);
      }
    }
  }, {
    key: 'seedCollectionWithDynamicData',
    value: function seedCollectionWithDynamicData(dynamicData) {
      if ((typeof dynamicData === 'undefined' ? 'undefined' : _typeof(dynamicData)) !== 'object') this.throwSeederError('Only an object can be passed to the dynamic option.');
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

  }, {
    key: 'checkForExistingData',
    value: function checkForExistingData(collection, modelCount) {
      var existingCount = collection.find().count();
      return modelCount ? existingCount >= modelCount : existingCount > 0;
    }
  }, {
    key: 'createData',
    value: function createData(collection, value, iteration) {
      var data = value.data; // Cache this as a variable before it gets sanitized by the insert.
      var dataId = collection.insert(value);
      if (data) this.seedDependent(dataId, data, iteration);
    }
  }, {
    key: 'seedDependent',
    value: function seedDependent(dataId, data, iteration) {
      var dependent = data(dataId, _faker2.default, iteration);
      if (dependent && dependent.collection) this.seed(this.validateCollection(dependent.collection), dependent);
    }
  }]);

  return Seeder;
}();

exports.default = function (collection, options) {
  return new Seeder(collection, options);
};