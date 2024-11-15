import fs from 'fs'

function generateRecords(baseRecord, count) {
  let csvContent = 'name,email\n'
  const [name, email] = baseRecord
  const [emailName, domain] = email.split('@')

  for (let i = 1; i <= count; i++) {
    const newEmail = `${emailName}${i}@${domain}`
    csvContent += `${name},${newEmail}\n`
  }

  fs.writeFileSync('generated_records.csv', csvContent)
  console.log(
    `Successfully generated ${count} records in generated_records.csv`
  )
}

const baseRecord = ['Omar Shah', 'omar@gmail.com']
const numberOfRecords = 1000

generateRecords(baseRecord, numberOfRecords)
