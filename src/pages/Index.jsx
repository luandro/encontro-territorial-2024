import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Loader from '@/components/Loader';
import NavBar from '@/components/NavBar';
import Hero from '@/components/Hero';
import Info from '@/components/Info';
import Schedule from '@/components/Schedule';
import Participants from '@/components/Participants';
import PastEditions from '@/components/PastEditions';
import Footer from '@/components/Footer';

const fetchMarkdownContent = async (file) => {
  const response = await fetch(file);
  return response.text();
};

const fetchNotionBlocks = async () => {
  const response = await fetch('/notionBlocks.json');
  return response.json();
};

const extractMetaData = (text) => {
  const metaRegex = /^---\n([\s\S]*?)\n---/;
  const match = text.match(metaRegex);
  if (!match) return [null, {}];
  const rawMeta = match[0];
  const metaText = match[1];
  const metaData = {};
  metaText.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':').map(part => part.trim());
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      metaData[key] = value;
    }
  });
  return [rawMeta, metaData];
};

const extractParticipants = (markdown) => {
  const sections = markdown.split('\n### ').slice(1);
  return sections.map(section => {
    const [name, ...content] = section.split('\n');
    return { name, content: content.join('\n').trim() };
  });
};

const extractGalleryItems = (markdown) => {
  const regex = /^(?:##\s(.+)|!\[(.+?)\]\((.+?)\)|<iframe.*?src="(.+?)".*?title="(.+?)".*?><\/iframe>)/gm;
  const matches = [...markdown.matchAll(regex)];
  return matches.map(match => {
    if (match[1]) {
      return { type: 'title', content: match[1] };
    } else if (match[2] && match[3]) {
      return { type: 'image', alt: match[2], src: match[3] };
    } else if (match[4] && match[5]) {
      return { type: 'video', src: match[4], title: match[5] };
    }
  }).filter(Boolean);
};

const Index = () => {
  const [markdownContents, setMarkdownContents] = useState({});
  const [metaData, setMetaData] = useState({});
  const [activeSection, setActiveSection] = useState('');

  const sectionRefs = {
    informacoes: useRef(null),
    schedule: useRef(null),
    participants: useRef(null),
    'edicoes-anteriores': useRef(null),
  };

  const { data: notionBlocks, isLoading: isLoadingNotionBlocks } = useQuery({
    queryKey: ['notionBlocks'],
    queryFn: fetchNotionBlocks,
  });

  const { data: markdownData, isLoading: isLoadingMarkdown } = useQuery({
    queryKey: ['markdownData', notionBlocks],
    queryFn: async () => {
      if (!notionBlocks) return null;
      const contents = {};
      for (const block of notionBlocks) {
        contents[block.name] = await fetchMarkdownContent(`/content/${block.fileName}`);
      }
      return contents;
    },
    enabled: !!notionBlocks,
  });
  useEffect(() => {
    if (markdownData) {
      const newMetaData = {};
      const newMarkdownContents = {};
      console.log('Processing markdown data...');
      console.log('Starting to process markdown data...');
      for (const [key, content] of Object.entries(markdownData)) {
        console.log(`Processing ${key}...`);
        const [rawMeta, metaData] = extractMetaData(content);
        console.log(`Extracted metadata for ${key}:`, metaData);
        newMetaData[key] = metaData;
        newMarkdownContents[key] = content.replace(rawMeta, "").trim();
        console.log(`Processed content for ${key}:`, newMarkdownContents[key].substring(0, 50) + '...');
        
        if (key === 'Edições Anteriores') {
          console.log('Processing gallery items for Edições Anteriores...');
          const galleryItems = extractGalleryItems(newMarkdownContents[key]);
          console.log('Extracted gallery items:', galleryItems);
          newMetaData[key] = { ...newMetaData[key], gallery: galleryItems };
        }

        if (key === 'Participants') {
          console.log('Processing participants...');
          const participants = extractParticipants(newMarkdownContents[key]);
          console.log('Extracted participants:', participants);
          newMetaData[key] = { ...newMetaData[key], participants };
        }
      }
      
      console.log('Setting new metadata:', newMetaData);
      setMetaData(newMetaData);
      console.log('Setting new markdown contents...');
      setMarkdownContents(newMarkdownContents);
      console.log('Finished processing markdown data.');
    }
  }, [markdownData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5, rootMargin: "0px 0px -200px 0px" }
    );

    const currentRefs = Object.values(sectionRefs).filter(ref => ref.current);
    
    currentRefs.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      currentRefs.forEach((ref) => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
    };
  }, [sectionRefs]);

  if (isLoadingNotionBlocks || isLoadingMarkdown) {
    return <div className="flex justify-center items-center h-screen bg-[#FFF5E1]">
      <Loader />
    </div>;
  }

  function smoothScroll (to) {
    document.querySelector(`#${to}`).scrollIntoView({
      behavior: 'smooth'
    });
  }
  console.log('META', metaData)
  console.log('CONTENT', markdownContents)
  const scheduleTitle = markdownContents['Event Schedule']?.split('\n').find(line => line.startsWith('#'))?.replace(/^#+\s*/, '').trim();
  const scheduleItems = markdownContents['Event Schedule']?.split('\n\n**').slice(1).map(item => `**${item}`);

  return (
    <div className="min-h-screen bg-[#FFF5E1] text-[#1E3D59]">
      <NavBar onSmoothScroll={smoothScroll} activeSection={activeSection} />

      <main className="pt-40 container mx-auto px-4 py-12">
        <Hero
          title={metaData['Evento Info']?.title}
          title2={metaData['Evento Info']?.title_2}
          subTitle={metaData['Evento Info']?.subTitle}
          subTitle2={metaData['Evento Info']?.subTitle2}
          onSmoothScroll={smoothScroll}
        />
        {metaData['Evento Info'] && markdownContents['Evento Info'] && (
          <div id="informacoes" ref={sectionRefs.informacoes}>
            <Info
              data={metaData['Evento Info'].data}
              local={metaData['Evento Info'].local}
              localMedia={metaData['Evento Info'].localMedia}
              markdown={markdownContents['Evento Info']}
            />
          </div>
        )}
        {scheduleTitle && scheduleItems && (
          <div id="schedule" ref={sectionRefs.schedule}>
            <Schedule title={scheduleTitle} scheduleItems={scheduleItems} />
          </div>
        )}
        {metaData['Participants'] && markdownContents['Participants'] && (
          <div id="participants" ref={sectionRefs.participants}>
            <Participants 
              markdownContent={markdownContents['Participants']}
            />
          </div>
        )}
        {markdownContents['Edições Anteriores'] && metaData['Edições Anteriores'] && (
          <div id="edicoes-anteriores" ref={sectionRefs['edicoes-anteriores']}>
            <PastEditions
              markdown={markdownContents['Edições Anteriores']}
              metaData={metaData['Edições Anteriores']}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
