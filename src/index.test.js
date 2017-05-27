import seeder from './index';

class Collection {
  constructor(name) {
    this._name = name;
    this._driver = { mongo: true };
    this.documents = [];
  }

  insert(doc) {
    this.documents.push(doc);
  }

  findOne(query) {
    return query;
  }

  find() {
    this.count = () => this.documents.length;
    return this;
  }

  remove() {
    // Mocked as a full blow away as .remove() usage in package is only for wiping the collection.
    this.documents = [];
  }
}

const Coffee = new Collection('Coffee');

const testDocuments = [
  { type: 'Guatemalan' },
  { type: 'Columbian' },
  { type: 'Kenyan' },
];

beforeEach(() => {
  global.Meteor = require('meteor/meteor');
  global.process = { env: { NODE_ENV: 'development' } };
  Coffee.documents = [];
});

test('it seeds the collection using static data', () => {
  seeder(Coffee, {
    environments: ['development'],
    data: testDocuments,
  });

  expect(Coffee.find().count()).toBe(3);
});

test('it seeds the collection using model data', () => {
  seeder(Coffee, {
    environments: ['development'],
    count: 5,
    model(index) {
      return {
        type: `Coffee #${index}`,
      };
    },
  });

  expect(Coffee.find().count()).toBe(5);
});

test('it wipes the collection before seeding with static data', () => {
  Coffee.documents = testDocuments;

  seeder(Coffee, {
    environments: ['development'],
    wipe: true,
    count: 5,
    model(index) {
      return {
        type: `Coffee #${index}`,
      };
    },
  });

  expect(Coffee.find().count()).toBe(5);
});

test('it blocks seeding if no environments are set in options', () => {
  seeder(Coffee, {
    count: 5,
    model(index) {
      return {
        type: `Coffee #${index}`,
      };
    },
  });

  expect(Coffee.find().count()).toBe(0);
});

test('it seeds using Faker data in the model', () => {
  seeder(Coffee, {
    environments: ['development'],
    count: 5,
    model(index, faker) {
      return {
        type: faker.lorem.words(5),
      };
    },
  });

  expect(Coffee.find().count()).toBe(5);
});
