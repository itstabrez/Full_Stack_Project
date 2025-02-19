import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save( { validateBeforeSave : false } );
        return {accessToken , refreshToken};
    } catch (error) {
        throw new ApiError(500 , "Something Went Wrong While Generating Refresh And Access Token");
    }
}

const registerUser = asyncHandler( async (req ,res) => {
   

    const {fullName , email , userName ,  password} = req.body

    if (
        [fullName , email , userName , password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400 , "Full Name is required")
    }
    
    const existedUser = await User.findOne({
        $or : [{ email } , { userName }]
    })
    if(existedUser){
        throw new ApiError(409 , "User with same email or username already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400 , "Avatar is not successfully uploaded")
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        userName : userName.toLowerCase(),
    })

    const isCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!isCreated){
        throw new ApiError(500 , "Something Wemt Wrong While Registering User")
    }

    return res.status(201).json(
        new ApiResponse(200 , isCreated , "User Created Successfully")
    )

} )

const loginUser = asyncHandler(async (req , res) => {
    //User Name Or Email Will be used to login 
    //First will check if user exist
    //will check if password is correct
    //then will generate access token
    //after that will generate refresh token
    //wil send tokens as cookie 
    //Then will return response
    

    const {email , username , password} = req.body;

    if(!(email || username)){
        throw new ApiError(400 , "Username or email is required");
    }

    const user = await User.findOne(
        {
            $or : [{email}, {username}]
        }
    );

    if(!user){
        throw new ApiError(404 , "Username or email doesn't exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401 , "Invalid User Credentials");
    }

    const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly : true,
        secure : true,
    }

    return res.status(200)
    .cookie("accessToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken , options)
    .json(new ApiResponse(200 , 
    {
        user : loggedInUser , accessToken , refreshToken
    },
    "User Logged in Successfully",
))
})

const logoutUser = asyncHandler( async (req , res) => {
    await User.findByIdAndUpdate(req.user._id , {
        $set : {
            refreshToken : undefined,
        },
    },
    {
        new: true,
    }
)
    const options = {
        httpOnly : true,
        secure : true,
    }
    res.status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(
        new ApiResponse(200 , {} , " User Logged Out Successfully")
    )
})


export { 
    registerUser,
    loginUser,
    logoutUser
}