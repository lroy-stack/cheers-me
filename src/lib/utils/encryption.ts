import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 16

function getKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH)
}

function getSecret(): string {
  const secret = process.env.POS_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error(
      'Encryption secret not configured. Set POS_ENCRYPTION_SECRET environment variable.'
    )
  }
  return secret
}

export function encrypt(data: Record<string, unknown>): string {
  const secret = getSecret()
  const salt = randomBytes(SALT_LENGTH)
  const key = getKey(secret, salt)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const plaintext = JSON.stringify(data)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  // Format: salt:iv:tag:encrypted (all hex)
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted,
  ].join(':')
}

export function decrypt(encryptedString: string): Record<string, unknown> {
  const secret = getSecret()
  const parts = encryptedString.split(':')
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format')
  }

  const [saltHex, ivHex, tagHex, encrypted] = parts
  const salt = Buffer.from(saltHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const key = getKey(secret, salt)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return JSON.parse(decrypted)
}
