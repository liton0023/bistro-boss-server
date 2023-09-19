const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// middleweres
app.use(cors());
app.use(express.json());

const verifyJWt = (req, res, next) => {
  // console.log('heating the jwt')
  const authorization = req.headers.authorization;
  // console.log(token)
  if (!authorization) {
    return res.status(401).send({ error: true, massage: "Unauthoriization" });
  }

  if (authorization !== undefined) {
    // Use the split function on yourVariable here
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_JWT, (err, decoded) => {
      if (err) {
        return res.status(401).send({ error: true, massage: "Unauthoriization" });
      }
      req.decoded = decoded;
      // console.log(decoded)
      next();
    });
   
} else {
    console.error('The variable is undefined.');
}
 
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bzjru.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db("bistroDb").collection("menu");
    const reviewsCollection = client.db("bistroDb").collection("reviews");
    const cartCollection = client.db("bistroDb").collection("carts");
    const usersCollection = client.db("bistroDb").collection("users");


     // Warning: use verifyJWT before using verifyAdmin
     const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    // jwt token acces

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_JWT, { expiresIn: "1h" });
      res.send({ token: token });
    });

    // users collection apis

    app.get("/users",verifyJWt,verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      // console.log("user", existingUser);
      if (existingUser) {
        return res.send({ massage: "User Alredy Create" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // verify jwt with admin secqurity

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.get("/users/admin/:email", verifyJWt, async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const decodedEmail=req.decoded.email;
      // console.log(decodedEmail)
      if (decodedEmail != email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      // console.log(query)
      const user = await usersCollection.findOne(query);
      console.log('user:',user);
      const result = { admin: user?.role === "admin" };
      console.log("admin:", result);
      res.send(result);
    });

    // menu collection api

    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.post('/menu',verifyJWt, verifyAdmin , async(req, res)=>{
      const newItem =req.body;
      const result =await menuCollection.insertOne(newItem);
      res.send(result)
    })

    app.delete('/menu/:id',verifyJWt ,verifyAdmin, async(rew ,res)=>{

      const id =rew.params.id
      const query ={ _id: new ObjectId(id)};
      const result = await menuCollection.deleteOne(query);
      res.send(result);

    })
    //  update menu
    app.patch('/menu/:id',verifyJWt, verifyAdmin,async(req,res)=>{
      const id =req.params.id;
      const filter ={_id: new ObjectId(id)};
      const updateDoc={
        $set:{
          name:'',
          category:'',
          price:'',
          recipe:''
        }
      }
      const result= await menuCollection.updateOne(filter , updateDoc);
      console.log(result)
      res.send(result);
    })
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // cart collection api
    app.get("/carts", verifyJWt, async (req, res) => {
      const email = req.query.email;
      // console.log('email',email)
      // console.log(email);

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      // console.log('decoded email:', decodedEmail)
      if (decodedEmail != email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("boss in running");
});

app.listen(port, () => {
  console.log(`Bistro Boss is running on ${port}`);
});
