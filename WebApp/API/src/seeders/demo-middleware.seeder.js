'use strict';
import argon2 from 'argon2';

const userSeeder = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('middleware', [
      {
        uuid: '386fb0cd-d411-41be-a521-cacdf1de9720',
        password: await argon2.hash('middleware', {
          type: argon2.argon2id,
          timeCost: 8,
          memoryCost: 2 ** 19,
          parallelism: 6,
        }),
        name: 'mid1',
        description: 'demo middleware',
        IP: '127.0.0.1',
        status: 'Accepted',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('user', null, {});
  }
};

export default userSeeder;