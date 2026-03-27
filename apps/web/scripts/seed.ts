import { initClient } from "@ts-rest/core";
import { appContract } from "@repo/rest-contracts";
import { faker } from "@faker-js/faker";
import { register } from "@repo/auth-client";

const API_URL = process.env.VITE_BACKEND_URL || "http://localhost:3000";

console.log(`Targeting API: ${API_URL}`);

const NUM_USERS = 10;
const MAX_POSTS_PER_USER = 5;
const MAX_COMMENTS_PER_POST = 3;
const MAX_REACTIONS_PER_POST = 8;

async function seed() {
  console.log("🌱 Starting seed script...");

  // 1. Create Users
  const users: {
    id: string;
    username: string;
    headers: Record<string, string>;
  }[] = [];

  for (let i = 0; i < NUM_USERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = faker.internet
      .username({ firstName, lastName })
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const email = faker.internet.email({ firstName, lastName });
    const password = "password123";

    try {
      const registerRes = await register({
        email,
        password,
        name: `${firstName} ${lastName}`,
        username,
      });
      if (registerRes.error) {
        console.warn(
          `⚠️ Failed to register user ${username}: ${registerRes.error}`,
        );
        continue;
      }

      const headers = {
        Origin: "http://localhost:3000",
        Authorization: `Bearer ${registerRes.token}`,
      };

      const tempClient = initClient(appContract, {
        baseUrl: API_URL,
        baseHeaders: headers,
      });

      const me = await tempClient.me();

      if (me.status !== 200) {
        console.warn(
          `⚠️ Failed to get user details for ${username}: ${me.status}`,
        );
        continue;
      }

      users.push({
        id: me.body.id,
        username: username,
        headers,
      });
    } catch (error) {
      console.error(`❌ Error processing user ${username}:`, error);
    }
  }

  if (users.length === 0) {
    console.error("❌ No users created. Exiting.");
    process.exit(1);
  }

  // 2. Follows
  console.log("\n🔗 Creating follows...");
  for (const user of users) {
    // Pick 3-5 random users to follow (excluding self)
    const others = users.filter((u) => u.id !== user.id);
    const numFollows = faker.number.int({
      min: 3,
      max: Math.min(5, others.length),
    });
    const targets = faker.helpers.arrayElements(others, numFollows);

    const userClient = initClient(appContract, {
      baseUrl: API_URL,
      baseHeaders: user.headers,
    });

    for (const target of targets) {
      const res = await userClient.followUser({
        params: { id: target.id },
      });
      if (res.status === 201) {
        console.log(`  ${user.username} followed ${target.username}`);
      }
    }
  }

  // 3. Create Posts
  console.log("\n📝 Creating posts...");
  const allPosts: { id: string; authorId: string }[] = [];

  for (const user of users) {
    const userClient = initClient(appContract, {
      baseUrl: API_URL,
      baseHeaders: user.headers,
    });
    const numPosts = faker.number.int({ min: 1, max: MAX_POSTS_PER_USER });

    for (let i = 0; i < numPosts; i++) {
      const postType = faker.helpers.arrayElement([
        "text",
        "poll",
        "visualization",
      ]);
      let content: any = {};

      if (postType === "text") {
        content = {
          text: faker.lorem.paragraph(),
        };
      } else if (postType === "poll") {
        content = {
          text: faker.lorem.sentence() + " (Poll)",
          poll: {
            question: faker.lorem.sentence() + "?",
            options: [
              { id: "opt1", label: faker.word.words(2) },
              { id: "opt2", label: faker.word.words(2) },
              { id: "opt3", label: faker.word.words(2) },
            ],
            allowsMultipleSelections: faker.datatype.boolean(),
          },
        };
      } else {
        // Visualization
        content = {
          text: faker.lorem.sentence() + " (Data)",
          visualization: {
            title: faker.company.catchPhrase(),
            visualizationType: faker.helpers.arrayElement([
              "bar",
              "pie",
              "line",
            ]),
            data: [
              { label: "Q1", value: faker.number.int({ min: 10, max: 100 }) },
              { label: "Q2", value: faker.number.int({ min: 10, max: 100 }) },
              { label: "Q3", value: faker.number.int({ min: 10, max: 100 }) },
              { label: "Q4", value: faker.number.int({ min: 10, max: 100 }) },
            ],
          },
        };
      }

      const res = await userClient.createPost({
        body: { content },
      });

      if (res.status === 201) {
        allPosts.push({ id: res.body.id, authorId: user.id });
        console.log(
          `  Post created by ${user.username}: ${res.body.id.slice(0, 8)}...`,
        );
      } else {
        console.error(
          `  ❌ Failed to create post for ${user.username}:`,
          res.status,
        );
      }
    }
  }

  // 4. Reactions & Comments
  console.log("\n❤️💬 Adding reactions and comments...");

  for (const post of allPosts) {
    // Reactions
    const potentialReactors = users.filter((u) => u.id !== post.authorId); // Can react to own post? Usually yes, but let's mix it up
    const numReactions = faker.number.int({
      min: 0,
      max: Math.min(MAX_REACTIONS_PER_POST, potentialReactors.length),
    });
    const reactors = faker.helpers.arrayElements(
      potentialReactors,
      numReactions,
    );

    for (const reactor of reactors) {
      const client = initClient(appContract, {
        baseUrl: API_URL,
        baseHeaders: reactor.headers,
      });

      const type = faker.helpers.arrayElement(["upvote", "downvote"] as const);

      await client.reactToPost({
        params: { id: post.id },
        body: { type },
      });
    }

    // Comments
    const numComments = faker.number.int({
      min: 0,
      max: MAX_COMMENTS_PER_POST,
    });
    for (let i = 0; i < numComments; i++) {
      const commenter = faker.helpers.arrayElement(users);
      const client = initClient(appContract, {
        baseUrl: API_URL,
        baseHeaders: commenter.headers,
      });

      const commentRes = await client.createComment({
        params: { postId: post.id },
        body: {
          content: faker.lorem.sentence(),
        },
      });

      if (commentRes.status === 201) {
        // Maybe add a reply?
        if (faker.datatype.boolean()) {
          const replier = faker.helpers.arrayElement(users);
          const replyClient = initClient(appContract, {
            baseUrl: API_URL,
            baseHeaders: replier.headers,
          });

          await replyClient.createReply({
            params: { id: commentRes.body.id },
            body: { content: faker.lorem.sentence() },
          });
        }
      }
    }
  }

  console.log("\n✨ Seed complete!");
}

seed().catch(console.error);
