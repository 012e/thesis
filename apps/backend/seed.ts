import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { faker } from '@faker-js/faker';
import { nanoid } from 'nanoid';

import * as schema from './src/db/schema';
import * as authSchema from './src/db/auth-schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle({
  client: pool,
  schema: { ...schema, ...authSchema },
});

/**
 * Generate a unique ID for a user
 */
function generateUserId(): string {
  return nanoid(16);
}

/**
 * Create seed users
 */
async function seedUsers(count: number = 5) {
  console.log(`\n🌱 Creating ${count} users...`);

  const userIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const userId = generateUserId();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = faker.internet.username().toLowerCase();

    await db.insert(authSchema.user).values({
      id: userId,
      name: `${firstName} ${lastName}`,
      email: faker.internet.email(),
      username,
      displayUsername: username,
      emailVerified: true,
      createdAt: faker.date.past({ years: 1 }),
    });

    userIds.push(userId);
    console.log(`  ✓ User created: ${username} (${userId})`);
  }

  return userIds;
}

/**
 * Generate random post content (text, poll, or visualization)
 */
function generatePostContent() {
  const contentType = Math.random();

  if (contentType < 0.6) {
    // Text post (60%)
    return {
      text: faker.lorem.paragraphs({ min: 1, max: 3 }),
    };
  } else if (contentType < 0.8) {
    // Poll post (20%)
    const question = faker.lorem.sentence();
    const optionCount = faker.number.int({ min: 2, max: 4 });
    const options = Array.from({ length: optionCount }, (_, i) => ({
      id: `option-${i + 1}`,
      label: faker.lorem.words({ min: 1, max: 3 }),
    }));

    return {
      poll: {
        question,
        options,
        allowsMultipleSelections: faker.datatype.boolean(),
        closesAt: faker.datatype.boolean()
          ? faker.date.future().toISOString()
          : null,
      },
    };
  } else {
    // Visualization post (20%)
    const dataPoints = Array.from(
      { length: faker.number.int({ min: 3, max: 6 }) },
      () => ({
        label: faker.lorem.word(),
        value: faker.number.int({ min: 10, max: 1000 }),
      }),
    );

    return {
      visualization: {
        title: faker.lorem.sentence(),
        visualizationType: faker.helpers.arrayElement([
          'bar',
          'line',
          'pie',
          'table',
        ] as const),
        data: dataPoints,
        description: faker.lorem.sentence(),
        unit: faker.helpers.arrayElement([
          'users',
          'items',
          'views',
          'clicks',
          'sales',
        ]),
      },
    };
  }
}

/**
 * Create posts for users
 */
async function seedPosts(userIds: string[], postsPerUser: number = 3) {
  console.log(
    `\n📝 Creating ${postsPerUser} posts per user (${userIds.length * postsPerUser} total)...`,
  );

  const postIds: string[] = [];

  for (const userId of userIds) {
    for (let i = 0; i < postsPerUser; i++) {
      const postContent = generatePostContent();
      const [post] = await db
        .insert(schema.posts)
        .values({
          authorId: userId,
          content: postContent,
          createdAt: faker.date.past({ years: 1 }),
        })
        .returning();

      postIds.push(post.id);
      console.log(
        `  ✓ Post created for user ${userId.slice(0, 8)}: ${post.id.slice(0, 8)}`,
      );
    }
  }

  return postIds;
}

/**
 * Create reactions on posts
 */
async function seedReactions(userIds: string[], postIds: string[]) {
  console.log(`\n👍 Creating reactions...`);

  let reactionsCreated = 0;

  for (const postId of postIds) {
    const reactionCount = faker.number.int({ min: 0, max: userIds.length });
    const reactingUsers = faker.helpers.arrayElements(userIds, reactionCount);

    for (const userId of reactingUsers) {
      try {
        await db.insert(schema.postReactions).values({
          postId,
          userId,
          type: faker.helpers.arrayElement(['upvote', 'downvote'] as const),
          createdAt: faker.date.past({ years: 1 }),
        });
        reactionsCreated++;
      } catch {
        // Ignore duplicate reactions (same user, same post)
      }
    }
  }

  console.log(`  ✓ ${reactionsCreated} reactions created`);
}

/**
 * Create threads (for multi-turn conversations)
 */
async function seedThreads(userIds: string[], threadsPerUser: number = 2) {
  console.log(
    `\n💬 Creating ${threadsPerUser} threads per user (${userIds.length * threadsPerUser} total)...`,
  );

  const threadIds: string[] = [];

  for (const userId of userIds) {
    for (let i = 0; i < threadsPerUser; i++) {
      const [thread] = await db
        .insert(schema.threads)
        .values({
          userId,
          title: faker.lorem.sentence(),
          externalId: `thread-${nanoid(8)}`,
          createdAt: faker.date.past({ years: 1 }),
        })
        .returning();

      threadIds.push(thread.id);
      console.log(
        `  ✓ Thread created for user ${userId.slice(0, 8)}: "${thread.title}" (${thread.id.slice(0, 8)})`,
      );
    }
  }

  return threadIds;
}

/**
 * Create follows between users
 */
async function seedFollows(userIds: string[]) {
  console.log(`\n👥 Creating user follows...`);

  let followsCreated = 0;

  for (const followerId of userIds) {
    const followCount = faker.number.int({ min: 1, max: userIds.length - 1 });
    const followees = faker.helpers.arrayElements(
      userIds.filter((id) => id !== followerId),
      followCount,
    );

    for (const followeeId of followees) {
      try {
        await db.insert(schema.userFollows).values({
          followerId,
          followeeId,
          createdAt: faker.date.past({ years: 1 }),
        });
        followsCreated++;
      } catch {
        // Ignore duplicate follows
      }
    }
  }

  console.log(`  ✓ ${followsCreated} follows created`);
}

/**
 * Main seed function
 */
async function main() {
  try {
    console.log('🚀 Starting database seed...');

    // Create users
    const userIds = await seedUsers(5);

    // Create posts with reactions
    const postIds = await seedPosts(userIds, 3);
    await seedReactions(userIds, postIds);

    // Create threads
    await seedThreads(userIds, 2);

    // Create follows
    await seedFollows(userIds);

    console.log('\n✨ Database seed completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Users: ${userIds.length}`);
    console.log(`   Posts: ${postIds.length}`);
    console.log(`   Threads: ${userIds.length * 2}`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
