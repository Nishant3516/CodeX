import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/projectStore";

import { fetchQuest, fetchCheckpointAssets, RawQuest } from "@/helpers/projectHelpers";

/**
 * Custom hook to load project and initialize store
 * @param paramsPromise Promise resolving to params object with projectID
 */
export function useProject(
  paramsPromise: Promise<{ projectID: string }>
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const setProjectData = useProjectStore(state => state.setProjectData);

  useEffect(() => {
    let canceled = false;
    paramsPromise
      .then(async ({ projectID }) => {
        try {
          const quest: RawQuest = await fetchQuest(projectID);
          
          // Fetch all checkpoint assets and boilerplate in one call
          const { checkpoints, boilerplateCode } = await fetchCheckpointAssets(
            quest.checkpoints,
            quest.boiler_plate_code
          );

          if (!canceled) {
            setProjectData({
              projectId: quest.id,
              title: quest.name,
              description: quest.description,
              requirements: quest.requirements || [],
              checkpoints,
              boilerplateCode, // Pass the extracted boilerplate code
            });
          }
        } catch (err: any) {
          if (!canceled) setError(err);
        } finally {
          if (!canceled) setLoading(false);
        }
      })
      .catch((err) => {
        if (!canceled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      canceled = true;
    };
  }, []); // Remove setProjectData from dependencies

  return { loading, error };
}
