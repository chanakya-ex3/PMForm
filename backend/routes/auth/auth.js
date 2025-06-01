const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const router = require("express").Router();
const User = require("../../models/User");
dotenv.config();

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findOne({ email });
    console.log(user)
    if (user) {
      return res.status(400).json({ message: "User Already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const newUser = new User({
      name,
      email,
      password:hash
    });
    newUser.save();
    const payload = {
      user: {
        id: newUser.id,
      },
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: 3600,
    });
    res.status(200).send({ message: "Account Created Successfully", token,name,id:newUser.id });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Server Error", error: e });
  }
});

router.post('/login',async (req,res)=>{
    try{
        const {email, password} = req.body
    const user = await User.findOne({email})
    if(!user){
        return res.status(400).json({message:"User dosenot exist"})
    }
    console.log(req.body)
    console.log('user')
    const isMatch = await bcrypt.compare(password,user.password);
    if(!isMatch){
        return res.status(400).json({message:"Incorrect password"})
    }
    const payload = {
        user:{
            id:user.id
        }
    }
    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
            expiresIn:3600
        }
    )
    delete user.password
    console.log("success hit")
    res.status(200).send({message:"Logged in Successfully",token,name:user.name,id:user.id})
    }
    catch (e){
        console.log(e)
        res.status(500).send({message:"Error Occured",error:e.message})
    }
})

module.exports = router;