import React, { useEffect, useState } from 'react'
import type { Route } from '../+types/root';
import { Link, useNavigate, useParams } from 'react-router';
import { usePuterStore } from '~/lib/puter';
import Summary from '~/components/feedback/Summary';
import ATS from '~/components/feedback/ATS';
import Details from '~/components/feedback/Details';

export function meta({}: Route.MetaArgs) {
  return [
      {title: 'Resume Analyser | Review'},
      {name: 'description', content: 'Detailed overview of your resume'},
  ];
}

const resume = () => {
  const {isLoading, auth, fs, kv} = usePuterStore();
  const {id} = useParams();
  const [imageUrl, setImageURL] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we're sure auth is not loading and user is not authenticated
    if (!isLoading && !auth.isAuthenticated && id) {
      console.log('User not authenticated, redirecting to auth page');
      navigate(`/auth?next=/resume/${id}`, { replace: true });
    }
  }, [isLoading, auth.isAuthenticated, id, navigate])

  useEffect(() => {
    if (!id || isLoading || !auth.isAuthenticated) return;

    const loadResume = async () => {
      try {
        setIsLoadingResume(true);
        console.log('Loading resume with id:', id);
        
        // Add a small delay to ensure data is available in KV store
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const resume = await kv.get(`resume:${id}`);

        if (!resume) {
          console.error('Resume not found for id:', id);
          setIsLoadingResume(false);
          return;
        }

        const data = JSON.parse(resume);
        console.log('Resume data loaded:', data);

        const resumeBlob = await fs.read(data.resumePath);
        if(!resumeBlob) {
          console.error('Failed to read resume blob');
          setIsLoadingResume(false);
          return;
        }

        const pdfBlob = new Blob([resumeBlob], {type: 'application/pdf'});
        const resumeUrl = URL.createObjectURL(pdfBlob);
        setResumeUrl(resumeUrl);

        const imageBlob = await fs.read(data.imagePath);
        if(!imageBlob) {
          console.error('Failed to read image blob');
          setIsLoadingResume(false);
          return;
        }
        
        const imageUrl = URL.createObjectURL(imageBlob);
        setImageURL(imageUrl);

        if (data.feedback) {
          setFeedback(data.feedback);
        }
        
        setIsLoadingResume(false);
      } catch (error) {
        console.error('Error loading resume:', error);
        setIsLoadingResume(false);
      }
    }

    loadResume();
  }, [id, isLoading, auth.isAuthenticated, kv, fs])

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">
            Back to Homepage
          </span>
        </Link>
      </nav>

      <section className="main-section pt-0">
        <div className="flex flex-row w-full gap-8 max-lg:flex-col-reverse">
          <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-sceen sticky top-24 items-center justify-center">
            {imageUrl && resumeUrl && (
              <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 max-w-xl h-fit w-fit">
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={imageUrl}
                    className="w-full h-full object-contain rounded-2xl"
                    title="resume"
                  />
                </a>
              </div>
            )}
          </section>

          <section className="feedback section">
            <h2 className="text-4xl text-black! font-bold">Resume Review</h2>
            {isLoadingResume ? (
              <div className="flex flex-col items-center gap-4">
                <img src="/images/resume-scan-2.gif" className="w-full" />
                <p className="text-gray-600">Loading resume data...</p>
              </div>
            ) : feedback ? (
              <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                <Summary feedback={feedback} />
                <ATS
                  score={feedback.ATS.score || 0}
                  suggestions={feedback.ATS.tips || []}
                />
                <Details feedback={feedback} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <img src="/images/resume-scan-2.gif" className="w-full" />
                <p className="text-gray-600">Waiting for analysis results...</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

export default resume