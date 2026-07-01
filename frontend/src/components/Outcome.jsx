import { useState } from 'react'
import OutcomeList from './Outcome/OutcomeList'
import OutcomeForm from './Outcome/OutcomeForm'

export default function Outcome({ user }) {
    const [view, setView] = useState('list') // 'list' | 'form'
    const [selectedOutcome, setSelectedOutcome] = useState(null)

    const handleEdit = (outcome) => {
        setSelectedOutcome(outcome)
        setView('form')
    }

    const handleAddNew = () => {
        setSelectedOutcome(null)
        setView('form')
    }

    if (view === 'form') {
        return <OutcomeForm user={user} setView={setView} initialData={selectedOutcome} onCancel={() => { setSelectedOutcome(null); setView('list') }} />
    }

    return <OutcomeList user={user} setView={setView} handleEdit={handleEdit} handleAddNew={handleAddNew} />
}
