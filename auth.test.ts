import { describe, it, expect } from 'vitest'
import { hashPassword, isHash, readAccounts, checkLogin } from '../domain/auth'
import { parseCsv } from '../domain/csv'
describe('login', () => {
  it('hash 64 heksa, deterministik, beda per user & password', async () => {
    const a = await hashPassword('Racel', 'sandi-contoh-12345'); expect(isHash(a)).toBe(true)
    expect(await hashPassword('racel', 'sandi-contoh-12345')).toBe(a); expect(await hashPassword('rully', 'sandi-contoh-12345')).not.toBe(a); expect(await hashPassword('racel', 'lain')).not.toBe(a)
  })
  it('baca tabel dengan kolom No., Nama, User ID, Password', async () => {
    const h = await hashPassword('racel', 'sandi-contoh-12345')
    const { accounts, problem } = readAccounts(parseCsv(`No.,Nama,User ID,Password\n1,Racel,racel,${h}\n2,Popi,popi,teks-biasa\n`)); expect(problem).toBeUndefined(); expect(accounts).toHaveLength(2)
    expect(await checkLogin(accounts, 'RACEL', 'sandi-contoh-12345')).toMatchObject({ ok: true, user: { id: 'racel', nama: 'Racel' } })
    expect(await checkLogin(accounts, 'racel', 'salah')).toMatchObject({ ok: false, reason: 'salah' })
    expect(await checkLogin(accounts, 'popi', 'teks-biasa')).toMatchObject({ ok: true, user: { id: 'popi' } })
    expect(await checkLogin(accounts, 'popi', 'Teks-Biasa')).toMatchObject({ ok: false, reason: 'salah' })
    expect(await checkLogin(accounts, 'tidakada', 'x')).toMatchObject({ ok: false, reason: 'salah' })
  })
  it('format tabel tak dikenali dilaporkan', () => { expect(readAccounts(parseCsv('a,b\n1,2\n')).problem).toContain('tidak ditemukan') })
})
