'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _en = require('faker/locale/en');

var _en2 = _interopRequireDefault(_en);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Seeder = function () {
  function Seeder(collection, options) {
    _classCallCheck(this, Seeder);

    if (!collection) this.throwSeederError('Please supply a MongoDB collection instance to seed.');
    if (!this.isValidMongoDBCollection(collection)) this.throwSeederError('Value passed for "collection" is not a valid MongoDB collection.');

    if (!options) this.throwSeederError('Please supply options for seeding.');
    if (!options.environments) this.throwSeederError('Must pass an array of environments where seeding is allowed.');

    if (!this.environmentAllowed(options.environments)) {
      this.throwSeederError('Seeding not allowed in this environment.', true);
      return;
    }

    if (!options.data) this.throwSeederError('Must pass a data object with static array, dynamic object, or both.');
    if (options.data && !options.data.static && !options.data.dynamic) this.throwSeederError('Must assign a static array or dynamic object to data in options.');

    // NOTE: If collection and options are valid, set them on the instance for access inside of other methods.
    this.collection = collection;
    this.options = _extends({
      resetCollection: false,
      seedIfExistingData: false
    }, options);

    if (Meteor && Meteor.isServer) {
      if (this.options.resetCollection) this.resetCollection();
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
    value: function throwSeederError(message, consoleOnly) {
      var error = '[@cleverbeagle/seeder] ' + message + ' See http://cleverbeagle.com/packages/seeder/v2 for usage instructions.';

      if (consoleOnly) {
        console.warn(error);
      } else {
        throw new Error(error);
      }
    }
  }, {
    key: 'environmentAllowed',
    value: function environmentAllowed(environments) {
      return environments.indexOf(process.env.NODE_ENV) > -1;
    }
  }, {
    key: 'resetCollection',
    value: function resetCollection() {
      this.collection.remove({});
    }
  }, {
    key: 'seedCollection',
    value: function seedCollection() {
      // NOTE: If options.seedIfExisting data is FALSE and the collection has data, stop immediately.
      if (!this.options.seedIfExistingData && this.collectionHasExistingData(this.collection)) return;
      if (this.options.data.static) this.seedCollectionWithStaticData(this.options.data.static);
      if (this.options.data.dynamic) this.seedCollectionWithDynamicData(this.options.data.dynamic);
    }
  }, {
    key: 'collectionHasExistingData',
    value: function collectionHasExistingData(collection, modelCount) {
      var existingCount = this.collection.find().count();
      return modelCount ? existingCount >= modelCount : existingCount > 0;
    }
  }, {
    key: 'seedCollectionWithStaticData',
    value: function seedCollectionWithStaticData(staticData) {
      var _this = this;

      if (!(staticData instanceof Array)) {
        this.throwSeederError('Only an array can be passed to the static option.');
      }

      staticData.forEach(function (staticDataItem) {
        _this.createDataItem(staticDataItem);
      });
    }
  }, {
    key: 'isUsersCollection',
    value: function isUsersCollection() {
      return this.collection._name === 'users';
    }
  }, {
    key: 'createDataItem',
    value: function createDataItem(dataItem) {
      var idOfItemCreated = void 0;

      // NOTE: Do this to avoid SimpleSchema package wiping dependent data before we use it.
      var dependentData = dataItem && dataItem.dependentData;

      if (this.isUsersCollection()) {
        idOfItemCreated = this.createUser(dataItem);
      } else {
        idOfItemCreated = this.collection.insert(dataItem);
      }

      // NOTE: Ensure parent data was actually created before attempting this.
      if (idOfItemCreated && dependentData) {
        dependentData(idOfItemCreated);
      }
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

        return userId;
      }
    }
  }, {
    key: 'seedCollectionWithDynamicData',
    value: function seedCollectionWithDynamicData(dynamicData) {
      // NOTE: Checking if dynamicData is an actual object (not an array or other value).
      if (Object.prototype.toString.call(dynamicData) !== '[object Object]') this.throwSeederError('Only an object can be passed to the dynamic option.');
      if (dynamicData && dynamicData.count && typeof dynamicData.count !== 'number') this.throwSeederError('count property defined on the object passed to the dynamic option must be a number.');
      if (dynamicData && dynamicData.seed && typeof dynamicData.seed !== 'function') this.throwSeederError('seed property defined on the object passed to the dynamic option must be a function.');

      for (var currentItemIndex = 0; currentItemIndex < dynamicData.count; currentItemIndex += 1) {
        var itemToCreate = dynamicData.seed(currentItemIndex, _en2.default);
        this.createDataItem(itemToCreate);
      }
    }
  }]);

  return Seeder;
}();

exports.default = function (collection, options) {
  return new Seeder(collection, options);
};