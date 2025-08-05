import React, { forwardRef } from 'react';

type PreviewProps = {
  srcDoc: string;
};

const PreviewIframe = forwardRef<HTMLIFrameElement, PreviewProps>(({ srcDoc }, ref) => {
  return (
    <iframe
      ref={ref}
      srcDoc={srcDoc}
      className="w-full h-full bg-white dark:bg-gray-900"
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
    />
  );
});

PreviewIframe.displayName = 'PreviewIframe';

export default PreviewIframe;
