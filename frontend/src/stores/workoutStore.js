import { create } from 'zustand';

export const useWorkoutStore = create((set) => ({
  workouts: [],

  addWorkout: (workout) =>
    set((state) => ({
      workouts: [
        ...state.workouts,
        {
          ...workout,
          id: Date.now(),
          completed: false,
        },
      ],
    })),

    toggleWorkout: (id) =>
      set((state) => ({
        workouts: state.workouts.map((workout) =>
          workout.id === id
            ? { ...workout, completed: !workout.completed }
            : workout
        ),
      })),
}));