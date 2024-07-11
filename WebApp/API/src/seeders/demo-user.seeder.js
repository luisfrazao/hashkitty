'use strict';
import argon2 from 'argon2';

const userSeeder = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('user', [
      {
        username: 'admin',
        password: await argon2.hash('admin', {
          type: argon2.argon2id,
          timeCost: 8,
          memoryCost: 2 ** 19,
          parallelism: 6,
        }),
        user_type: 'admin',
        email: 'admin@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: 'user',
        password: await argon2.hash('user', {
          type: argon2.argon2id,
          timeCost: 8,
          memoryCost: 2 ** 19,
          parallelism: 6,
        }),
        user_type: 'user',
        email: 'user@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('user', null, {});
  }
};

export default userSeeder;
