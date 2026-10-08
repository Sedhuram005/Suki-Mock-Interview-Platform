const { MongoClient } = require('mongodb');

async function main() {
  const uri = 'mongodb+srv://sedhu:Suki0365@cluster0.qikfajl.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const sukiUser = await client.db('test').collection('users').findOne({ email: 'suki123@gmail.com' });
    if (sukiUser) {
      const updateData = { ...sukiUser };
      delete updateData._id; // prevent duplicate key error if upserting with different ID
      await client.db('mockinterview').collection('users').updateOne(
        { email: 'suki123@gmail.com' },
        { $set: updateData },
        { upsert: true }
      );
      console.log('Successfully synced suki123 to mockinterview database!');
    }
  } finally {
    await client.close();
  }
}

main().catch(console.error);
