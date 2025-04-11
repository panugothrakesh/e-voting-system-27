import CryptoJS from 'crypto-js'

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'your-secret-key-here'

export const encryptAddress = (address: string): string => {
  return CryptoJS.AES.encrypt(address, SECRET_KEY).toString()
}

export const decryptAddress = (encryptedAddress: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedAddress, SECRET_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

export const hashAddress = (address: string): string => {
  return CryptoJS.SHA256(address).toString()
} 