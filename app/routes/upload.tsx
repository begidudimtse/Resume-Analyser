import React, { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router';
import FileUploader from '~/components/FileUploader';
import Navbar from '~/components/Navbar'
import { convertPdfToImage } from '~/lib/pdf2img';
import { usePuterStore} from "~/lib/puter"
import { generateUUID } from './utils';
import { prepareInstructions, AIResponseFormat } from '~/constants';

const upload = () => {
  const {auth, isLoading, fs, ai, kv} = usePuterStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [file, setFile] = useState<File|null>(null)

  const handleFileSelect = (file: File | null) => {
    setFile(file)
  }
  
  const handleAnalyze = async ({companyName,jobTitle,jobDescription, file} : {companyName : string, jobTitle : string, jobDescription : string , file: File}) => {
      setIsProcessing(true);
      setStatusText('Uploading the file...');
      const uploadFile = await fs.upload([file]);

      if(!uploadFile) return setStatusText('Error: failed to upload file');

      setStatusText('Converting to image...');
      const imageFile = await convertPdfToImage(file);
      if(!imageFile.file) {
        const errorMsg = imageFile.error || 'Unknown error occurred';
        return setStatusText(`Error: failed to convert PDF to image - ${errorMsg}`);
      }

      setStatusText("Uploading the image...");
      const uploadImage = await fs.upload([imageFile.file]);
      if(!uploadImage) return setStatusText('Error: failed to upload image');

      setStatusText('Preparing data...');

      const uuid = generateUUID();
      const data = {
        id: uuid,
        resumePath: uploadFile.path,
        imagePath: uploadImage.path,
        companyName, jobTitle, jobDescription,
        feedback: '',
      }

      await kv.set(`resume:${uuid}`, JSON.stringify(data));

      setStatusText('Analyzing...');

      const feedback = await ai.feedback(
        uploadFile.path,
        prepareInstructions({jobTitle, jobDescription, AIResponseFormat})
      )
      if(!feedback) return setStatusText('Error to analyze resume');
      
      const feedbackText = typeof feedback.message.content === 'string' 
        ? feedback.message.content
        : feedback.message.content[0].text;

      data.feedback = JSON.parse(feedbackText);
      await kv.set(`resume:${uuid}`, JSON.stringify(data));
      setStatusText('Analysis complete, redirecting...');
     
      navigate(`/resume/${uuid}`);
      
  }

  const handleSubmit = (e : FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if(!form) return;
      const formData = new FormData(form);

      const companyName = formData.get('company-name') as string;
      const jobTitle = formData.get('job-title') as string;
      const jobDescription = formData.get('job-description') as string;
   
     if(!file) return; 

     handleAnalyze({companyName,jobTitle,jobDescription, file});
  }
  
  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className='page-heading py-16'>
          <h1>Smart feedback for your dream job</h1>
             {isProcessing ? (
              <>
              <h2>{statusText}</h2>
              <img src='/images/resume-scan.gif' className='w-full'/>
              </>
             ) : (
              <h2>Drop your resume for an ATS score and improvement tips </h2>
             )}

             {!isProcessing &&(
              <form id="upload-form" onSubmit={handleSubmit} className='flex flex-col gap-4 mt-8'>
                <div className='form-div'>
                  <label htmlFor='company-name'>Company Name</label>
                  <input type='text' name='company-name' placeholder='Company Name' id="company-name" />
                </div>

                <div className='form-div'>
                  <label htmlFor='job-title'>Job Title</label>
                  <input type='text' name='job-title' placeholder='job-title' id="job-title" />
                </div>

                <div className='form-div'>
                  <label htmlFor='job-description'>Job Description</label>
                  <textarea rows={5} name='job-description' placeholder='job-description' id="job-description" />
                </div>

                <div className='form-div'>
                  <label htmlFor='uploader'>Upload Resume</label>
                  <FileUploader onFileSelect={handleFileSelect}/>
                </div>

                <button className='primary-button'>Analyze Resume</button>
              </form>
             )}
        </div>

      </section>
     </main>  
  )
}

export default upload