const { models: {userDb} } = require('../index');

const getUsers = async (params) => {
    console.log("--- get users params:", params);
    try {
        let query = {};
        if (params.search) {
            query.$or = [
                { name: { $regex: params.search, $options: 'i' } },
                { email: { $regex: params.search, $options: 'i' } }
            ];
        }

        const userList = await userDb.find(query).limit(parseInt(params.limit) || 25).sort({ Date: 1 });
        console.log("--- Retrieved users:", userList.length);
        return userList.map((user) => {
            const plainUser = user.toObject();
            plainUser.isOnline = Boolean(plainUser.isOnline && plainUser.lastSeen && Date.now() - new Date(plainUser.lastSeen).getTime() < 90000);
            return plainUser;
        });
    } catch (error) {
        console.log("Error in getUsers:", error);
        throw error;
    }
}


const getUser = async ({ _id, email, limit = 10 }) => {
    console.log("--- get user params:", { _id, email, limit });
    try {
        let query = {};
        if (_id) {
            query._id = _id;
        }
        if (email) {
            query.email = email;
        }
        const user = await userDb.findOne(query);
        console.log("--- Retrieved user:", user);
        return user;
    } catch (error) {
        console.log("Error in getUser:", error);
        throw error;
    }
}

const addUser = async (payload) => {
    console.log("--- add user payload:", payload);
    try {
        const findUserByEmail = await userDb.findOne({ email: payload.email });
        if(findUserByEmail) {
            throw new Error("Email đã tồn tại!");
        }
        const newUser = new userDb(payload);
        await newUser.save();
        return newUser;
    } catch (error) {
        console.log("Error in addUser:", error);
        throw error;
    }
}

const updateUser = async (payload) => {
    console.log("--- update user payload:", payload);
    try {
        const findUserById = await userDb.findById(payload._id);
        if(!findUserById) {
            throw new Error("Không tìm thấy user id!");
        }
        const updatedUser = Object.assign(findUserById, payload);
        await updatedUser.save();
        return updatedUser;
    } catch (error) {
        console.log("Error in updateUser:", error);
        throw error;
    }
}

const deleteUser = async (_id) => {
    const deletedUser = await userDb.findByIdAndDelete(_id);
    return deletedUser;
}

const updatePresence = async (_id, isOnline = true) => {
    return userDb.findByIdAndUpdate(_id, { isOnline, lastSeen: new Date() }, { new: true });
}

module.exports = {
    getUsers,
    getUser,
    addUser,
    updateUser,
    deleteUser,
    updatePresence
};