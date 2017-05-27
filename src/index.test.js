import seeder from './index';

class Collection {
  constructor(name) {
    this._name = name;
    this._driver = { mongo: true };
    this.documents = [];
  }

  insert(doc) {
    this.documents.push(doc);
    return doc;
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

const CoffeeShops = new Collection('CoffeeShops');
const Coffee = new Collection('Coffee');

const testCoffeeShops = [
  { name: 'Wicker Park' },
  { name: 'Gold Coast' },
  { name: 'Rogers Park' },
];

const testCoffees = [
  { type: 'Guatemalan' },
  { type: 'Columbian' },
  { type: 'Kenyan' },
];

beforeEach(() => {
  global.Meteor = require('meteor/meteor');
  global.process = { env: { NODE_ENV: 'development' } };
  CoffeeShops.documents = [];
  Coffee.documents = [];
});

test('it seeds the collection using static data', () => {
  seeder(CoffeeShops, {
    environments: ['development'],
    data: testCoffeeShops,
  });

  expect(CoffeeShops.find().count()).toBe(3);
});

test('it seeds the collection using model data', () => {
  seeder(CoffeeShops, {
    environments: ['development'],
    modelCount: 5,
    model(index) {
      return {
        type: `Coffee Shop #${index + 1}`,
      };
    },
  });

  expect(CoffeeShops.find().count()).toBe(5);
});

test('it wipes the collection before seeding with static data', () => {
  CoffeeShops.documents = testCoffeeShops;

  seeder(CoffeeShops, {
    environments: ['development'],
    wipe: true,
    modelCount: 5,
    model(index) {
      return {
        type: `Coffee Shop #${index + 1}`,
      };
    },
  });

  expect(CoffeeShops.find().count()).toBe(5);
});

test('it blocks seeding if no environments are set in options', () => {
  seeder(CoffeeShops, {
    modelCount: 5,
    model(index) {
      return {
        type: `Coffee Shop #${index + 1}`,
      };
    },
  });

  expect(CoffeeShops.find().count()).toBe(0);
});

test('it seeds using Faker data in the model', () => {
  seeder(CoffeeShops, {
    environments: ['development'],
    modelCount: 5,
    model(index, faker) {
      return {
        name: faker.lorem.words(5),
      };
    },
  });

  expect(CoffeeShops.find().count()).toBe(5);
});

test('it seeds the dependent collection with static data', () => {
  seeder(CoffeeShops, {
    environments: ['development'],
    modelCount: 5,
    model(index) {
      return {
        name: `Coffee Shop #${index + 1}`,
        data({ name }) {
          return {
            collection: Coffee,
            wipe: true,
            environments: ['development'],
            data: [
              { location: name, type: 'Guatemalan' },
              { location: name, type: 'Columbian' },
            ],
          };
        },
      };
    },
  });

  expect(Coffee.find().count()).toBe(2);
});

test('it seeds the dependent collection with model data', () => {
  seeder(CoffeeShops, {
    environments: ['development'],
    modelCount: 5,
    model(index) {
      return {
        name: `Coffee Shop #${index + 1}`,
        data({ name }) {
          return {
            collection: Coffee,
            wipe: true,
            environments: ['development'],
            modelCount: 10,
            model(index) {
              return {
                location: name,
                type: `Coffee #${index + 1 }`,
              };
            },
          };
        },
      };
    },
  });

  expect(Coffee.find().count()).toBe(10);
});
