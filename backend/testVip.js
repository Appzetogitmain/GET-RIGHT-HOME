import mongoose from 'mongoose';

mongoose.connect('mongodb+srv://sagarchouhan7609_db_user:sagarchouhan7609_db_user@cluster0.od9npjt.mongodb.net/hoomzo')
  .then(async () => {
    try {
      const db = mongoose.connection.db;
      const contents = await db.collection('homecontents').find({}).toArray();
      let modified = 0;
      for (const content of contents) {
        if (typeof content.firstBookingDiscount === 'string') {
          let num = parseInt(content.firstBookingDiscount.replace(/[^0-9]/g, ''));
          if (isNaN(num)) num = 10;
          await db.collection('homecontents').updateOne({ _id: content._id }, { $set: { firstBookingDiscount: num } });
          modified++;
        }
      }
      console.log('Migrated homecontents:', modified);
    } catch (err) {
      console.error(err);
    }
    process.exit(0);
  });
