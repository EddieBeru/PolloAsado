import { useState } from 'react'
import { useSavings } from '../hooks/useSavings'
import { useSettings } from '../hooks/useSettings'
import AhorroForm from './Savings/AhorroForm'
import AhorroList from './Savings/AhorroList'

export default function Savings({ user }) {
    const { savings, loading, syncError, addSaving, updateSaving, abonarSaving } = useSavings(user)
    const { settings } = useSettings()
    const baseCurrency = settings?.divisa_principal || 'CRC'
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState(null)

    const handleSubmit = async (formData) => {
        if (editing) await updateSaving(editing.id, formData)
        else await addSaving(formData)
        setShowForm(false)
        setEditing(null)
    }

    return (
        <div className="w-full flex-1 flex flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
                <h2 className="heading">Ahorros</h2>
                {!showForm && (
                    <button type="button" onClick={() => setShowForm(true)} className="btn-primary">Nueva meta</button>
                )}
            </div>

            {syncError && <p className="notice-warning" role="status">{syncError}</p>}

            {showForm ? (
                <AhorroForm
                    initialData={editing}
                    onSubmit={handleSubmit}
                    onCancel={() => { setShowForm(false); setEditing(null) }}
                />
            ) : (
                <AhorroList
                    savings={savings}
                    loading={loading}
                    onEdit={(item) => { setEditing(item); setShowForm(true) }}
                    onAbonar={abonarSaving}
                    currency={baseCurrency}
                />
            )}
        </div>
    )
}
