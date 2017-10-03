'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _faker = require('faker');

var _faker2 = _interopRequireDefault(_faker);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Seeder = function () {
  function Seeder(collection, options) {
    _classCallCheck(this, Seeder);

    if (!collection || !options) {
      throw new Error('Please supply a MongoDB collection instance to seed and options for seeding. Usage: seeder(collection, options).');
    }

    if (Meteor && Meteor.isServer) {
      this.seed(this.validateCollection(collection), options);
    } else {
      throw new Error('Seeder is only intended to be run in a Meteor server environment. See http://cleverbeagle.com/packages/seeder/usage for usage instructions.');
    }
  }

  _createClass(Seeder, [{
    key: 'validateCollection',
    value: function validateCollection(collection) {
      if (!collection._driver.mongo) throw new Error('Value passed for "collection" is not a MongoDB collection.');
      return collection;
    }
  }, {
    key: 'seed',
    value: function seed(collection, options) {
      var data = options.data,
          model = options.model;

      if (data) this.sow(data, collection, options);
      if (model) this.sow(model, collection, options);
    }
  }, {
    key: 'sow',
    value: function sow(data, collection, options) {
      if (options.wipe) collection.remove({});
      var isDataArray = data instanceof Array;
      var loopLength = isDataArray ? data.length : options.modelCount;
      var hasData = options.noLimit ? false : this.checkForExistingData(collection, options.modelCount);
      var collectionName = collection._name;
      var isUsers = collectionName === 'users';
      var environmentAllowed = this.environmentAllowed(options.environments);

      if (!hasData && environmentAllowed) {
        for (var i = 0; i < loopLength; i++) {
          var value = isDataArray ? data[i] : data(i, _faker2.default);

          try {
            if (isUsers) {
              this.createUser(collection, value, i); // Pass i for use with dependents.
            } else {
              this.createData(collection, value, i); // Pass i for use with dependents.
            }
          } catch (exception) {
            console.warn(exception);
          }
        }
      }
    }
  }, {
    key: 'checkForExistingData',
    value: function checkForExistingData(collection, modelCount) {
      var existingCount = collection.find().count();
      return modelCount ? existingCount >= modelCount : existingCount > 0;
    }
  }, {
    key: 'environmentAllowed',
    value: function environmentAllowed(environments) {
      if (environments) return environments.indexOf(process.env.NODE_ENV) > -1;
      return false;
    }
  }, {
    key: 'createUser',
    value: function createUser(collection, user, iteration) {
      var userToCreate = user;
      var isExistingUserConditions = [{ 'emails.address': userToCreate.email }];
      if (userToCreate.username) isExistingUserConditions.push({ username: userToCreate.username });
      var isExistingUser = collection.findOne({ $or: isExistingUserConditions });

      if (!isExistingUser) {
        var roles = userToCreate.roles;
        if (roles) delete userToCreate.roles;
        var userId = Accounts.createUser(userToCreate);
        if (roles && Roles !== 'undefined') Roles.addUsersToRoles(userId, roles);
        if (userToCreate.data) this.seedDependent(userId, userToCreate.data, iteration);
      }
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