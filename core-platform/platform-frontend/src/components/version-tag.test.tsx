import { render, screen } from '@testing-library/react';
import { VersionTagContent } from './version-tag';

describe('VersionTagContent', () => {
  it('renders version and build values', () => {
    render(<VersionTagContent meta={{ version: '1.2.3', build: '20260224.1' }} />);

    expect(screen.getByText('Version 1.2.3 (20260224.1)')).toBeInTheDocument();
  });

  it('uses truncation styling for long version strings', () => {
    render(
      <VersionTagContent
        meta={{
          version: '1.2.3-feature-super-long-build-metadata-string',
          build: 'build-1234567890-very-long',
        }}
      />
    );

    const tag = screen.getByLabelText(
      'Version 1.2.3-feature-super-long-build-metadata-string (build-1234567890-very-long)'
    );
    expect(tag).toHaveClass('truncate');
  });

  it('matches snapshot', () => {
    const { container } = render(
      <VersionTagContent meta={{ version: '1.2.3', build: '20260224.1' }} />
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});
