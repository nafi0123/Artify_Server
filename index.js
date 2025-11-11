const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@module54.nimc7p2.mongodb.net/?appName=module54`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect client
    // await client.connect();
    console.log("MongoDB connected successfully");

    const db = client.db("artify_db");
    const productsCollection = db.collection("artwork");
    const favoritesCollection = db.collection("favorites");

    //     app.post("/favorites", async (req, res) => {
    //   const favoriteData = req.body; // e.g. { artworkId, title, imageUrl }
    //   const query = { artworkId: favoriteData.artworkId };

    //   try {
    //     const existing = await favoritesCollection.findOne(query);
    //     if (existing) {
    //       return res.status(200).send({ message: "Already favorited" });
    //     }

    //     const result = await favoritesCollection.insertOne(favoriteData);
    //     res.send(result);
    //   } catch (err) {
    //     res.status(500).send({ error: err.message });
    //   }
    // });

    app.post("/favorites", async (req, res) => {
      const favoriteData = req.body;
      const query = { artworkId: favoriteData.artworkId };
      try {
        const existing = await favoritesCollection.findOne(query);
        if (existing) {
          return res.status(200).send({ message: "Already favorited" });
        }

        const result = await favoritesCollection.insertOne(favoriteData);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.get("/favorites", async (req, res) => {
      try {
        const favorites = await favoritesCollection.find().toArray();
        res.send(favorites); // ✅
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.delete("/favorites/:artworkId", async (req, res) => {
      const artworkId = req.params.artworkId;
      try {
        const result = await favoritesCollection.deleteOne({ artworkId });
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // DELETE favorite by artworkId
    // DELETE favorite by _id
    app.delete("/my-favorites/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const result = await favoritesCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .send({ message: "Artwork not found in favorites" });
        }

        // Updated favorites list pathaite
        const updatedFavorites = await favoritesCollection.find({}).toArray();

        res.send(updatedFavorites);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // DELETE favorite by artworkId
    // app.delete("/favorites/:artworkId", async (req, res) => {
    //   const artworkId = req.params.artworkId; // URL theke artworkId neya
    //   try {
    //     // Delete favorite
    //     const result = await favoritesCollection.deleteOne({ artworkId });

    //     if (result.deletedCount === 0) {
    //       // jodi kono match na hoy
    //       return res
    //         .status(404)
    //         .send({ message: "Artwork not found in favorites" });
    //     }

    //     // Optionally, updated favorites list pathaite paro
    //     const updatedFavorites = await favoritesCollection.find({}).toArray();

    //     res.send({
    //       message: "Deleted successfully",
    //       favorites: updatedFavorites,
    //     });
    //   } catch (err) {
    //     res.status(500).send({ error: err.message });
    //   }
    // });

    // GET artwork route
    app.get("/artwork", async (req, res) => {
      try {
        const email = req.query.email;
        const query = email ? { userEmail: email } : {};
        const result = await productsCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.patch("/artwork/like/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const artwork = await productsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!artwork)
          return res.status(404).send({ message: "Artwork not found" });

        // Determine new like count for toggle
        const isLiked = artwork.isLiked || false;

        const updatedArtwork = await productsCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          {
            $inc: { likes: isLiked ? -1 : 1 },
            $set: { isLiked: !isLiked },
          },
          { returnDocument: "after" }
        );

        res.send(updatedArtwork);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: err.message });
      }
    });

    app.get("/artwork-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    app.get("/artworks-recent", async (req, res) => {
      try {
        const artwork = await productsCollection
          .find({ visibility: "Public" })
          .sort({ date: -1 })
          .limit(6)
          .toArray();
        res.json(artwork);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  } catch (err) {
    console.log(err);
  }
}
run().catch(console.dir);

// root route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
