import mongoose from 'mongoose'

const voterSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
  },
  isWhitelisted: {
    type: Boolean,
    default: false,
  },
  hasVoted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.models.Voter || mongoose.model('Voter', voterSchema) 