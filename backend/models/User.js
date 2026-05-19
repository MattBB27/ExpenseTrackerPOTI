// Mongoose model for application users.
//
// Passwords are never stored in plaintext. Routes never touch bcrypt directly;
// they call setPassword() and verifyPassword() on this model, which keeps the
// hashing details (algorithm, cost factor) in one place.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// bcrypt cost factor. 10 is a sensible default for 2026 hardware: roughly
// 100 ms per hash, which is fast enough for login UX and slow enough to make
// offline brute-forcing expensive.
const BCRYPT_COST = 10;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true, // saved lowercase; queries must lowercase manually
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-z0-9_]+$/,
        "Username can only contain lowercase letters, numbers, and underscores",
      ],
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

// Strip passwordHash (and the mongoose version key) from any res.json(user)
// call. Defence in depth: routes also explicitly pick which fields they
// return, but this catches anything that slips through.
userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

// Hash a plaintext password and store it on this document.
// Call this in routes instead of setting passwordHash directly.
userSchema.methods.setPassword = async function (plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, BCRYPT_COST);
};

// Compare a plaintext attempt against the stored hash.
userSchema.methods.verifyPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);
