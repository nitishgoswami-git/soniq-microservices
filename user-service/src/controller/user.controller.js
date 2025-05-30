import { verifyJWT } from "..middleware/auth.middleware.js";
import { User } from "./model.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {ApiResponse} from "../utils/apiResponse.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async (userId) => {
    // console.log(userId)
    try{
        const user = await User.findById(userId)
        // console.log(user)
        const AccessToken = user.generateAccessToken()
        const RefreshToken = user.generateRefreshToken()

        user.refreshToken = RefreshToken
        await user.save({validateBeforeSave : false}) 

        return {AccessToken,RefreshToken}

    }catch(err){
        console.log(err)

        throw new ApiError(500,"Some went wrong while generating Refresh and Access Token")
    }

} 


const registerUser = asyncHandler(async (req,res)=>{

    const {fullname, email, username, password} = req.body

    if (
        [fullname,email,username,password].some((field)=>
        field?.trim() === "")
    ){
        throw new ApiError(400, " All Fields are required")
    }

    const userExists = await User.findOne({
        $or: [{username},{email}]
    })
    if (userExists){ 
        throw new ApiError(409, "Username or Email already Exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path // get the path of multer 
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    console.log(req.files?.avatar[0]?.path )

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files?.coverImage[0]?.path
    }
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar Required for localpath")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar Required not uploaded")
    }

    const user = await User.create({
        fullname,
        avatar: {
            public_id: avatar.public_id,
            url: avatar.secure_url
        },
        coverImage: {
            public_id: coverImage?.public_id || "",
            url: coverImage?.secure_url || ""
        },
        email,
        password,
        username: username.toLowerCase()

    })

    const createdUser =  await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registerd successfully")
    )
})

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404).json({
      message: "User not exists",
    });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    res.status(400).json({
      message: "Invalid Password",
    });
    return;
  }

  const token = jwt.sign({ _id: user._id }, process.env.JWT_SEC, {
    expiresIn: "7d",
  });

  res.status(200).json({
    message: "Logged IN",
    user,
    token,
  });
});

export const myProfile = asyncHandler(async (req, res) => {
  const user = req.user;

  res.json(user);
});

export const addToPlaylist = asyncHandler(
  async (req, res) => {
    const userId = req.user?._id;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        message: "NO user with this id",
      });
      return;
    }

    if (user?.playlist.includes(req.params.id)) {
      const index = user.playlist.indexOf(req.params.id);

      user.playlist.splice(index, 1);

      await user.save();

      res.json({
        message: " Removed from playlist",
      });
      return;
    }

    user.playlist.push(req.params.id);

    await user.save();

    res.json({
      message: "Added to PlayList",
    });
  }
);