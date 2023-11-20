const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5100;

// middleweres
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iknar0j.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    
    const menuCollection = client.db('bistroDB').collection('menu');
    const reviewCollection = client.db('bistroDB').collection('reviews');
    const cartCollection = client.db('bistroDB').collection('carts');
    const userCollection = client.db('bistroDB').collection('users');

 
    
    
    // carts collecion

    app.get('/carts', async(req, res) =>{
      const email = req.query.email;
      const query = {email: email};
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/carts', async(req, res) =>{
      const cartItems = req.body;
      const result = await cartCollection.insertOne(cartItems);
      res.send(result);
    })

    app.delete('/carts/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

     //  jwt related api

  // app.post('/jwt', async(req, res) =>{
  //   res.send()
  // })

  app.post('/jwt', async(req, res) =>{
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN, {expiresIn: '1h'});
    res.send({token});
  })

  // middlewares
  const verifyToken = (req, res, next) =>{
    console.log('inside verify token',req.headers.authorization);
    if(!req.headers.authorization){
      return res.status(401).send({message: 'unauthorized domain'})
    }

    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) =>{
      if(error){
        return res.status(401).send({message: 'unauthorized access'})
      }
      req.decoded = decoded;
      next();
    })
    
  }

const verifyAdmin = async(req, res, next) =>{
  const email = req.decoded.email;
  const query = {email: email};
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if(!isAdmin){
    return res.status(403).send({message: 'forbidden access'})
  }
  next();
  
}


    // user related api

    app.get('/users', verifyToken, verifyAdmin, async(req, res) =>{
        const result = await userCollection.find().toArray();
        res.send(result);
    })

    app.post('/users', async(req, res) =>{

      const newUser = req.body;

      const query = {email: newUser.email};
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'user already existed.', insertedId: null});
      }
      const result = await userCollection.insertOne(newUser);
      res.send(result);

    })

    app.get('/users/admin/:email', verifyToken, async(req, res) =>{
    const email = req.params.email;
    if(email !== req.decoded.email){
      return res.status(403).send({message: 'unauthorized access.'})
    }
    const query = {email: email};
    const user = await userCollection.findOne(query);
    let admin = false;
    if(user){
      admin = user?.role === 'admin'
    }
      res.send({ admin });
  })


    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })


    // menu items

    app.get('/menu', async(req, res) =>{
      const result = await menuCollection.find().toArray();
      res.send(result);
  })

  app.get('/menu/:id',  async(req, res) =>{
    const id = req.params?.id;
    const query = {_id: id};
    const result = await menuCollection.findOne(query);
    res.send(result);
  })

  app.patch('/menu/:id',  async(req, res) =>{
    const menuItem = req.body;
    const id = req.params.id;
    const filter = {_id: id};
    const updateDoc = {
      $set:{
        name: menuItem.name,
        category: menuItem.category,
        price: menuItem.price,
        image: menuItem.image,
        recipe: menuItem.recipe
      }
    }
    const result = await menuCollection.updateOne(filter, updateDoc);
    res.send(result);
  })

  app.post('/menu', verifyToken, verifyAdmin, async(req, res) =>{
    const item = req.body;
    const result = await menuCollection.insertOne(item);
    res.send(result)
  })

  app.delete('/menu/:id', verifyToken, verifyAdmin, async(req, res) =>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await menuCollection.deleteOne(query);
    res.send(result);
  })
  
  app.get('/reviews', async(req, res) =>{
      const result = await reviewCollection.find().toArray();
      res.send(result);
  })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) =>{
    res.send('Bistro boss server is running...')
})

app.listen(port, () =>{
    console.log(`Bistro boss server is running on port: ${port}`)
})