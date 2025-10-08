import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download } from 'lucide-react';

export default function DHA802Generator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isTemplateLoaded, setIsTemplateLoaded] = useState(false);
  const [templateImage] = useState(() => new Image());
  
  useEffect(() => {
    // Load the template image
    templateImage.src = '/templates/dha-802-template.png';
    templateImage.onload = () => {
      setIsTemplateLoaded(true);
      console.log('Template loaded successfully');
      // Generate initial document
      generatePRP('Muhammad Mohsin', 'AD0116281', '54877885001');
    };
    templateImage.onerror = () => {
      console.error('Failed to load template image');
      setIsTemplateLoaded(false);
    };
  }, [templateImage]);
  
  const generatePRP = (name: string, permitNumber: string, referenceNo: string) => {
    const canvas = canvasRef.current;
    if (!canvas || !isTemplateLoaded) {
      console.error('Canvas or template not ready');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw the template image as background
    ctx.drawImage(templateImage, 0, 0, 2100, 2970);
    
    // Configure text settings for dynamic fields
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#000000';
    
    // Add dynamic text on top of template
    // These positions are calibrated to match your reference document
    
    // Permit Number
    ctx.fillText(permitNumber, 800, 945);
    
    // Reference Number  
    ctx.fillText(referenceNo, 1400, 945);
    
    // Surname (using same name for simplicity)
    ctx.fillText(name.split(' ').pop() || name, 620, 1055);
    
    // Maiden Surname (leave blank as per template)
    
    // First Names
    ctx.fillText(name.split(' ')[0] || name, 620, 1165);
    
    // Nationality
    ctx.fillText('FRANCE', 620, 1275);
    
    // Date of Birth
    ctx.fillText('1983/05/21', 620, 1385);
    
    // Gender
    ctx.fillText('MALE', 1200, 1385);
    
    // Date of Issue
    ctx.font = '30px Arial';
    ctx.fillText('2023/11/14', 515, 1785);
    
    // Add signature
    ctx.font = 'italic 40px Arial';
    ctx.fillText(name.charAt(0) + 'akholde', 450, 1730);
    
    // Director General signature
    ctx.font = '30px Arial';
    ctx.fillText('Makholde', 370, 1870);
    
    // Office stamp details
    ctx.font = '24px Arial';
    ctx.fillText('Makholde LT', 1450, 1710);
    ctx.fillText('PRETORIA 0001', 1450, 1850);
    
    // Date printed
    ctx.font = '20px Arial';
    ctx.fillText('2023/11/14', 430, 1950);
    
    // Control Number at bottom
    ctx.font = 'bold 28px Arial';
    ctx.fillText('No. A 297966', 1650, 2850);
  };
  
  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = 'DHA-802_PRP.png';
    link.href = canvas.toDataURL();
    link.click();
  };
  
  return (
    <div className="container mx-auto p-6">
      <Card className="p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-green-700 mb-2">
            DHA-802 Permanent Residence Permit Generator
          </h1>
          <p className="text-gray-600">
            Dynamic document generator using official template
          </p>
        </div>
        
        <div className="flex justify-center gap-4 mb-6 flex-wrap">
          <Button 
            onClick={() => generatePRP('Muhammad Mohsin', 'AD0116281', '54877885001')}
            className="bg-green-600 hover:bg-green-700"
          >
            Muhammad Mohsin
          </Button>
          <Button 
            onClick={() => generatePRP('Tasleem Mohsin', 'AUD115281', '54877885002')}
            className="bg-green-600 hover:bg-green-700"
          >
            Tasleem Mohsin
          </Button>
          <Button 
            onClick={() => generatePRP('Khunsha', 'KV4122911', '54877885003')}
            className="bg-green-600 hover:bg-green-700"
          >
            Khunsha
          </Button>
          <Button 
            onClick={downloadCanvas}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Download as Image
          </Button>
        </div>
        
        <div className="flex justify-center">
          {!isTemplateLoaded && (
            <div className="text-red-600 text-xl p-8 border-2 border-red-300 rounded">
              Template image not found - Please ensure the template is uploaded
            </div>
          )}
          <div 
            ref={canvasRef as any}
            style={{
              maxWidth: '700px',
              width: '100%',
              height: 'auto',
              display: isTemplateLoaded ? 'block' : 'none',
              border: '2px solid #006642',
              borderRadius: '4px',
              minHeight: '900px',
              backgroundColor: 'white'
            }}
          >
            {/* PDF preview will render here */}
          </div>
        </div>
      </Card>
    </div>
  );
}