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

  _createClass(Seeder, [{
    key: 'validateCollection',
    value: function validateCollection(collection) {
      if (!collection._driver.mongo) throw new Error('Value passed for "collection" is not a MongoDB collection.');
      return collection;
    }
  }, {
    key: 'seed',
    value: function seed() {
      var _options = this.options,
          data = _options.data,
          model = _options.model;

      if (data && model) throw new Error('Please choose to seed from either a data array or a model.');
      this.sow(data || model);
    }
  }, {
    key: 'sow',
    value: function sow(data) {
      if (this.options.wipe) this.collection.remove({});

      var isDataArray = data instanceof Array;
      var loopLength = isDataArray ? data.length : this.options.min;
      var hasData = this.checkForExistingData();
      var collectionName = this.collection._name;
      var isUsers = collectionName === 'users';
      var environmentAllowed = this.environmentAllowed();

      if (!hasData && environmentAllowed) {
        for (var i = 0; i < loopLength; i++) {
          var value = isDataArray ? data[i] : data(i, _faker2.default);

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
  }, {
    key: 'checkForExistingData',
    value: function checkForExistingData() {
      var existingCount = this.collection.find().count();
      return this.options.min ? existingCount >= this.options.min : existingCount > 0;
    }
  }, {
    key: 'environmentAllowed',
    value: function environmentAllowed() {
      var environments = this.options.environments;
      if (environments) return environments.indexOf(process.env.NODE_ENV) > -1;
      return false;
    }
  }, {
    key: 'createUser',
    value: function createUser(user) {
      var userToCreate = user;
      var isExistingUser = this.collection.findOne({ 'emails.address': userToCreate.email });
      if (!isExistingUser) {
        var roles = userToCreate.roles;
        if (roles) delete userToCreate.roles;
        var userId = Accounts.createUser(userToCreate);
        if (roles && Roles !== 'undefined') Roles.addUsersToRoles(userId, roles);
      }
    }
  }]);

  return Seeder;
}();

exports.default = function (collection, options) {
  return new Seeder(collection, options);
};