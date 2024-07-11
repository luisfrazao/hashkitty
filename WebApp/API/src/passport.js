import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import models from './models/index.js';
const { user,middleware } = models;
import { validate as uuidValidate } from 'uuid';

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
  try {
    if (!uuidValidate(jwt_payload.id)) {
      const userRecord = await user.findByPk(jwt_payload.id);
      if (userRecord) {
        return done(null, userRecord);
      } else {
        return done(null, false);
      }
    }
    const middlewareRecord = await middleware.findByPk(jwt_payload.id);
    if (middlewareRecord) {
      return done(null, middlewareRecord);
    } else {
      return done(null, false);
    }
  } catch (error) {
    return done(error, false);
  }
}));

export default passport;