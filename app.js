const express = require("express");
const bodyParser = require("body-parser");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const Event = require("./models/event");
const User = require("./models/user");
const event = require("./models/event");

const app = express();

const events = (eventIds) => {
  return Event.find({ _id: { $in: eventIds } })
    .then((events) => {
      return events.map((event) => {
        return {
          ...event._doc,
          _id: event.id,
          creator: user.bind(this, event.creator),
        };
      });
    })
    .catch((err) => {
      throw err;
    });
};

app.use(bodyParser.json());

const user = (userId) => {
  return User.findById(userId)
    .then((user) => {
      return {
        ...user._doc,
        _id: user.id,
        createEvents: events.bind(this, user._doc.createEvents),
      };
    })
    .catch((err) => {
      throw err;
    });
};

app.use(
  "/graphql",
  graphqlHTTP({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
            creator: User!
        }

        type User {
            _id: ID!
            email: String!
            password: String
            createdEvents: [Event!]
        }
        

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }
        
        input UserInput {
            email: String!
            password: String!
        }
        type RootQuery {
            events: [Event!]!
        }
        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }
        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
      events: () => {
        return Event.find()
          .populate("creator")
          .then((events) => {
            return events.map((event) => {
              return {
                ...event._doc,
                _id: event._doc._id.toString(),
                creator: {
                  ...event._doc.creator._doc,
                  _id: event._doc.creator.id,
                  creator: user.bind(this, event._doc.creator),
                },
              };
            });
          })
          .catch((err) => {
            throw err;
          });
      },
      createEvent: (args) => {
        const event = new Event({
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: +args.eventInput.price,
          date: new Date(args.eventInput.date),
          creator: "65d96a66d5cc493897358eee",
        });
        let createdEvent;
        return event
          .save()
          .then((result) => {
            createdEvent = {
              ...result._doc,
              _id: result._doc._id.toString(),
              creator: user.bind(this, result._doc.creator),
            };
            return User.findById("65d96a66d5cc493897358eee");
          })
          .then((user) => {
            if (!user) {
              throw new Error("User not found");
            }
            user.createEvents.push(event);
            return user.save();
          })
          .then((result) => {
            return createdEvent;
          })
          .catch((err) => {
            console.log(err);
            throw err;
          });
      },
      createUser: (args) => {
        return User.findOne({ email: args.userInput.email })
          .then((user) => {
            console.log(user, "user");
            if (user) {
              throw new Error("User already exists");
            }
            user.createEvents.push(event);
            return user.save();
          })
          .then((result) => {
            return createdEvent;
          })
          .catch((err) => {
            throw err;
          });
      },
    },
    graphiql: true,
  })
);

app.get("/", (req, res) => {
  res.send("Hello World");
});

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.qjkqa.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
  )
  .then(() => {
    console.log("Connected to database");
    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  })
  .catch((err) => {
    console.log(err);
  });
