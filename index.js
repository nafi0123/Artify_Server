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

    // GET artwork route

    app.delete("/artwork/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await productsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Artwork not found" });
        }
        res.send({ message: "Artwork deleted successfully" });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

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

    app.patch("/artwork/:id", async (req, res) => {
      const id = req.params.id;
      const updateArt = req.body;

      try {
        const query = { _id: new ObjectId(id) };
        const existingArt = await productsCollection.findOne(query);

        if (!existingArt) {
          return res.status(404).send({ message: "Artwork not found" });
        }

        const updatedData = {
          ...existingArt,
          ...updateArt,
          date: new Date(),
        };

        const update = { $set: updatedData };

        const result = await productsCollection.updateOne(query, update);

        if (result.modifiedCount === 0) {
          return res.status(200).send({ message: "No changes made" });
        }

        const updatedDoc = await productsCollection.findOne(query);
        res.send({
          message: "Artwork updated successfully",
          data: updatedDoc,
        });
      } catch (err) {
        console.error("Error updating artwork:", err);
        res.status(500).send({ error: err.message });
      }
    });

    app.post("/artwork", async (req, res) => {
      try {
        const artwork = req.body;
        const result = await productsCollection.insertOne(artwork);
        res.send({
          message: "Artwork added successfully",
          insertedId: result.insertedId,
          data: artwork,
        });
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
          .limit(8)
          .toArray();
        res.json(artwork);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Backend Route - /explore-artworks
    app.get("/explore-artworks", async (req, res) => {
      try {
        const {
          search = "",
          category = "All",
          sort = "",
          page = 1,
          limit = 8,
        } = req.query;

        let query = { visibility: "Public" };

        // Category filter
        if (category && category !== "All" && category !== "Others") {
          query.category = category;
        } else if (category === "Others") {
          query.category = { $nin: ["Painting", "Photography", "Digital Art"] };
        }

        // Search filter
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { "artistInfo.name": { $regex: search, $options: "i" } },
          ];
        }

        // Sorting
        let sortOption = {};
        if (sort === "priceAsc") sortOption.price = 1;
        else if (sort === "priceDesc") sortOption.price = -1;

        // Pagination
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 8;
        const skip = (pageNum - 1) * limitNum;

        const totalCount = await productsCollection.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limitNum);

        const artworks = await productsCollection
          .find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(limitNum)
          .toArray();

        res.json({ artworks, totalPages });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get("/artworks-stats", async (req, res) => {
      try {
        const artwork = await productsCollection.find().toArray();
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
