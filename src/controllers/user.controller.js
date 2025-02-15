import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"


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

export { registerUser }