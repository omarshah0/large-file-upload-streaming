"use client"

import React, { useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

interface UploadProgress {
    successCount: number;
    failCount: number;
}

const Home: React.FC = () => {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (result.jobId) {
                router.push(`/jobs/${result.jobId}`);
            }
        } catch (error) {
            console.error('Upload failed:', error);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFile(files[0]);
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Upload File</h1>
            <input
                type="file"
                onChange={handleFileChange}
                className="mb-4 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    hover:file:bg-primary/90"
            />
            <Button
                onClick={handleUpload}
                disabled={!file}
                className="w-full mb-4"
            >
                Upload
            </Button>
        </div>
    );
};

export default Home;
