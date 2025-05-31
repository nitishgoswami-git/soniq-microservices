import { verifyJWT } from "../middleware/auth.middleware.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const AccessToken = user.generateAccessToken();
    const RefreshToken = user.generateRefreshToken();

    user.refreshToken = RefreshToken; // Make sure refreshToken field is in your schema
    await user.save({ validateBeforeSave: false });

    return { AccessToken, RefreshToken };
  } catch (err) {
    console.error(err);
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if ([name, email, password].some((field) => !field || field.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(409, "Email already exists");
  }

  const user = await User.create({
    name,
    email,
    password, // hashed automatically by pre-save hook
    playlist: [],
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isMatch = await user.isPasswordCorrect(password);
  if (!isMatch) {
    throw new ApiError(400, "Invalid password");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const safeUser = await User.findById(user._id).select("-password -refreshToken");

  return res.status(200).json({
    message: "Logged in successfully",
    user: safeUser,
    token: accessToken,
    refreshToken,
  });
});

export const myProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  res.json(user);
});

export const addToPlaylist = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "No user with this id");
  }

  const videoId = req.params.id;
  if (user.playlist.includes(videoId)) {
    const index = user.playlist.indexOf(videoId);
    user.playlist.splice(index, 1);
    await user.save();

    return res.json({
      message: "Removed from playlist",
    });
  }

  user.playlist.push(videoId);
  await user.save();

  res.json({
    message: "Added to playlist",
  });
});
