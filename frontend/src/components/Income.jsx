import { useState } from 'react'
import IncomeList from './Income/IncomeList'
import IncomeForm from './Income/IncomeForm'

export default function Income({ user }) {
  const [view, setView] = useState('list') // 'list' | 'form'
  const [selectedIncome, setSelectedIncome] = useState(null)

  const handleEdit = (income) => {
    setSelectedIncome(income)
    setView('form')
  }

  const handleAddNew = () => {
    setSelectedIncome(null)
    setView('form')
  }

  if (view === 'form') {
    return <IncomeForm user={user} setView={setView} initialData={selectedIncome} onCancel={() => { setSelectedIncome(null); setView('list') }} />
  }

  return <IncomeList user={user} setView={setView} handleEdit={handleEdit} handleAddNew={handleAddNew} />
}
