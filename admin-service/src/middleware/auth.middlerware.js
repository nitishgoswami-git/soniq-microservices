import axios from "axios";
import multer from "multer";

export const isAuth = async (req, res, next) => {
  try {
    const token = req.headers.token;

    if (!token) {
      return res.status(403).json({
        message: "Please Login",
      });
    }

    const { data } = await axios.get(`${process.env.User_URL}/api/v1/user/me`, {
      headers: {
        token,
      },
    });

    req.user = data;
    next();
  } catch (error) {
    res.status(403).json({
      message: "Please Login",
    });
  }
};

// Multer setup
const storage = multer.memoryStorage();
const uploadFile = multer({ storage }).single("file");

export default uploadFile;
