var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
var axios = require("axios");
var moment = require("moment");
const { Op } = require('sequelize');
var authController = require('../middleware/auth');
const { 
    getUsers, getUser, addUser, updateUser
} = require('../mongodb/controllers/userControllers');
const dotevnv = require("dotenv");
dotevnv.config();
const SECRET_KEY = "6Ldf4ygqAAAAACazQlEP_kJCJ45AwLg5SMfy8LMQ";

module.exports = (router) => {
    router.post(`/authenticate/google`, authController.isBasicAuthAuthenticated, async(req, res) => {
        try {
            const googleResponse = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
                params: { id_token: req.body.credential }
            });
            const profile = googleResponse.data;
            const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
            console.log('-- Google token client:', { aud: profile.aud, clientId, email: profile.email });
            if (!clientId || profile.aud !== clientId || !profile.email_verified) {
                return res.status(401).json({ data: null, error: 'Client ID Google không khớp hoặc email Google chưa xác minh.' });
            }
            let user = await getUser({ email: profile.email.toLowerCase() });
            if (!user) {
                user = await addUser({ name: profile.name, email: profile.email.toLowerCase(), picture: profile.picture, googleId: profile.sub, isAuthenticated: true });
            } else {
                user = await updateUser({ _id: user._id, name: profile.name, picture: profile.picture, googleId: profile.sub, isAuthenticated: true });
            }
            return res.json({ data: user, error: null });
        } catch(error) {
            console.log('-- google authenticate error', error.message);
            return res.status(401).json({ data: null, error: 'Đăng nhập Google thất bại.' });
        }
    });

    router.post(`/authenticate`, authController.isBasicAuthAuthenticated, async(req, res) => {
        try {
            const { email } = req.body;
            let findUser = await getUser({ email });
            console.log("--- find user:", findUser);
            if(!findUser) {
                return res.json({ data: null, error: "Email đăng nhập không tồn tại!" });
            }
            if (process.env.SUPER_ADMIN_EMAIL && email.toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase()) {
                findUser.scope = "admin";
                await findUser.save();
            }
            return res.json({ data: findUser, error: null });
        } catch(error) {
            console.log("-- error", error)
            return res.json({ data: null, error: "authenticate is failed"  });;
        }
    });


    // router.post(`/authenticate`, async(req, res) => {
    //     try {
    //         const { phone, password } = req.body;
    //         if((phone === process.env.ADMIN_PHONE) && (password === process.env.ADMIN_PASSWORD)) {
    //             console.log("--- This is Admin")
    //             return res.json({ data: {phone: process.env.ADMIN_PHONE, isSuperAdmin: true}, error: null });
    //         } else {
    //             let findUser = await User.findOne({ 
    //                 where: { "phone": phone },
    //                 include: [
    //                     {
    //                         model: Company,
    //                         as: 'companyDetail'
    //                     },
    //                 ]
    //             });

    //             if(!findUser) {
    //                 return res.json({ data: null, error: "Số điện thoại đăng nhập không tồn tại!" });
    //             }

    //             const currentPasswordHash = findUser.password;

    //             bcrypt.compare(password, currentPasswordHash, async(err, result) => {
    //                 if(!result) {
    //                     return res.json({ data: null, error: "Số điện thoại hoặc mật khẩu đăng nhập không chính xác!" });
    //                 }

    //                 const payload = {"phone": phone};
    //                 jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '180000s' }, function(err, token) {
    //                     return res.json({ data: findUser, error: null });
    //                 });

    //                 // if(result) {
    //                 //     if(!firstUser.companyDetail?.is_active) {
    //                 //         return res.json({
    //                 //             data: null,
    //                 //             errorCode: 3003,
    //                 //             msg: "Phòng khám hiện tại đã bị khoá"
    //                 //         });
    //                 //     }

    //                 //     // check is active expired 
    //                 //     if(firstUser.companyDetail) {
    //                 //         let momentActiveExpired = moment(firstUser.companyDetail.active_expired || new Date());
    //                 //         let momentCurrentDate = moment(new Date());
    //                 //         let diffDays = momentActiveExpired.diff(momentCurrentDate, "days"); 
                                    
    //                 //         if(diffDays <= 0) {
    //                 //             return res.json({
    //                 //                 data: firstUser,
    //                 //                 errorCode: 4086,
    //                 //                 msg: "Tài khoản đã hết hạn sử dụng"
    //                 //             });
    //                 //         } 
    //                 //     }                   

    //                 //     // check block user
    //                 //     if(firstUser.is_block) {
    //                 //         return res.json({
    //                 //             data: null,
    //                 //             errorCode: 3005,
    //                 //             msg: "Tài khoản đang bị cấm"
    //                 //         });
    //                 //     }

                    
    //                 // } else {
    //                 //     return res.json({
    //                 //         data: null,
    //                 //         errorCode: 3000,
    //                 //         msg: "Số điện thoại hoặc mật khẩu không chính xác"
    //                 //     });
    //                 // }
    //             });
    //         } 
    //     } catch(error) {
    //         console.log("-- error", error)
    //         return res.json({ data: null, error: "authenticate is failed"  });;
    //     }
    // })

    // router.post(`/authenticateReCaptcha`, authController.isBasicAuthAuthenticated, async(req, res) => {
    //     const { token, inputVal } = req.body;

    //     try {
    //         // gửi secret key và response token tới Google Recaptcha API để xác thực
    //         const response = await axios.post(
    //             `https://www.google.com/recaptcha/api/siteverify?secret=${SECRET_KEY}&response=${token}`
    //         );

    //         if(response.data.success) {
    //             // res.send("Human");
    //             res.json({
    //                 action: "Human"
    //             })
    //         } else {
    //             res.json({
    //                 action: "Robot"
    //             })
    //             // res.send("Robot")
    //         }
    //     } catch(error) {
    //         // xử lý lỗi trong quá trình xử lý reCAPTCHA
    //         //console.error(error);
    //         //res.status(500).send("Error verifying reCAPTCHA");
    //         res.json(null);
    //     }
    // })

    // router.post(`/forgot_password`, authController.isBasicAuthAuthenticated, async (req, res) => {
    //     const firstUser = await User.findOne({
    //         where: {
    //             [Op.and]: [
    //                 {
    //                     is_active: true
    //                 },
    //                 {
    //                     email: req.body.email
    //                 },
    //                 {
    //                     phone: req.body.phone
    //                 }
    //             ]
    //         }
    //     }); 

    //     if(firstUser) {
    //         return res.json({
    //             status: 200,
    //             data: firstUser,
    //             msg: "success"
    //         });
    //     } else {
    //         res.json({
    //             status: 0,
    //             data: null,
    //             msg: "Không tìm thấy thông tin"
    //         });
    //     }
    // });
}
