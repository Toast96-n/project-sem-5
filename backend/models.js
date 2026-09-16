import mongoose from "mongoose";


const SigninSchema = mongoose.Schema({
    username: {
        type: String,
        require: true
    },
    email: {
        type: String,
        require: true
    },
    password: {
        type: String,
        require: true
    },
    signupInterest: {
        type: String,
        require: true
    },
    suggestionCategoriesGroup: {
        type: String,
        require: true
    }
},{
    versionKey:false
});

const Tokenverify = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SigninFrom',
        require: true
    },
    hashToken: {
        type: String,
        require: true
    },
    exprireAt: {
        type: Date,
        require: true
    }
},{
    versionKey:false
});

Tokenverify.index(
    { exprireAt: 1 },
    { expireAfterSeconds: 0 }
);

export const signupSchema = mongoose.model('SigninFrom', SigninSchema);
export const hashpasstoken = mongoose.model('HashPassToken', Tokenverify);

/* =========================================================
   NEW: Admin — manages advisers. Created only via seedAdmin.js
   (there is intentionally no public admin signup route).
   ========================================================= */
const AdminSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    password: { type: String, required: true }
}, { timestamps: true,versionKey:false });

export const Admin = mongoose.model('Admin', AdminSchema);

/* =========================================================
   NEW: Adviser — created by an Admin, logs in separately,
   toggles online/offline, gets picked by users for advice.
   ========================================================= */
const AdviserSchema = mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // matches the finder's category values: tech, sports, fitness, home, outdoor, fashion
    specialty: { type: String, required: true },
    isOnline: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true ,versionKey:false});

export const Adviser = mongoose.model('Adviser', AdviserSchema);

/* =========================================================
   NEW: AdviceRequest — one conversation "room" between a
   user and the adviser they picked.
   ========================================================= */
const AdviceRequestSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'SigninFrom', required: true },
    adviserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adviser', required: true },
    category: { type: String },
    subcategory: { type: String },
    budget: { type: Number },
    status: { type: String, enum: ['active', 'closed'], default: 'active' }
}, { timestamps: true ,versionKey:false});

export const AdviceRequest = mongoose.model('AdviceRequest', AdviceRequestSchema);

/* =========================================================
   NEW: Message — persisted chat messages for a request.
   ========================================================= */
const MessageSchema = mongoose.Schema({
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdviceRequest', required: true },
    senderRole: { type: String, enum: ['user', 'adviser'], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    text: { type: String, required: true }
}, { timestamps: true ,versionKey:false});

export const Message = mongoose.model('Message', MessageSchema);