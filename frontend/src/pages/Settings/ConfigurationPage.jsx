import React, { useState, useMemo } from 'react';
import { Key, RefreshCw } from 'lucide-react';
import ApiKeyCard from './components/ApiKeyCard';
import SecuritySection from './components/SecuritySection';
import ConfirmModal from './components/ConfirmModal';
import { getStoredApiKeys, saveApiKeys, generateId, generateKey } from '../../services/api';

const ConfigurationPage = () => {
    const initialKeys = useMemo(() => {
        const keys = getStoredApiKeys();
        if (keys && keys.length > 0) return keys;
        
        const defaultKey = {
            id: generateId(),
            name: 'Frontend Client',
            key: 'sk-' + generateKey(48),
            created: new Date().toISOString(),
            role: 'Internal'
        };
        saveApiKeys([defaultKey]);
        return [defaultKey];
    }, []);

    const [apiKeys, setApiKeys] = useState(initialKeys);
    const [copiedId, setCopiedId] = useState(null);
    const [visibleKeyId, setVisibleKeyId] = useState(null);
    const [showConfirmReplace, setShowConfirmReplace] = useState(false);

    const handleGenerateClick = () => {
        if (apiKeys.length > 0) {
            setShowConfirmReplace(true);
        } else {
            confirmGenerateKey();
        }
    };

    const confirmGenerateKey = () => {
        const newKey = {
            id: generateId(),
            name: `Service Agent ${new Date().getFullYear()}`,
            key: 'sk-' + generateKey(48),
            created: new Date().toISOString(),
            role: 'Read/Write'
        };
        
        const updatedKeys = [newKey];
        setApiKeys(updatedKeys);
        saveApiKeys(updatedKeys);
        setShowConfirmReplace(false);
        setVisibleKeyId(newKey.id);
        setTimeout(() => setVisibleKeyId(null), 5000);
    };

    const deleteKey = (id) => {
        const updatedKeys = apiKeys.filter(k => k.id !== id);
        setApiKeys(updatedKeys);
        saveApiKeys(updatedKeys);
    };

    const copyToClipboard = (text, id) => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const toggleVisibility = (id) => {
        setVisibleKeyId(prev => prev === id ? null : id);
    };

    if (!apiKeys) return null;

    return (
        <div className="flex-1 overflow-auto p-8 space-y-8 custom-scrollbar relative">
            <div className="max-w-4xl space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">System Configuration</h1>
                    <p className="text-muted-foreground">Manage API access tokens and security settings for the MedGemma Bridge.</p>
                </div>

                <div className="glass-card p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                <Key size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white">API Keys</h2>
                                <p className="text-sm text-muted-foreground">Manage access tokens for external integrations.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleGenerateClick}
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium text-sm"
                        >
                            <RefreshCw size={16} />
                            Rotate / Generate Key
                        </button>
                    </div>

                    <div className="space-y-4">
                        {apiKeys.map((item) => (
                            <ApiKeyCard 
                                key={item.id}
                                item={item}
                                visibleKeyId={visibleKeyId}
                                copiedId={copiedId}
                                onToggleVisibility={toggleVisibility}
                                onCopy={copyToClipboard}
                                onDelete={deleteKey}
                            />
                        ))}

                        {apiKeys.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                                No active API keys found. Generate one to get started.
                            </div>
                        )}
                    </div>
                </div>

                <SecuritySection />
            </div>

            <ConfirmModal 
                show={showConfirmReplace}
                onCancel={() => setShowConfirmReplace(false)}
                onConfirm={confirmGenerateKey}
            />
        </div>
    );
};

export default ConfigurationPage;
