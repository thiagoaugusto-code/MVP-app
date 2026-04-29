import { create } from 'zustand';

export const useWorkoutStore = create((set) => ({
  workouts: [
    {
      id: 1,
      name: 'Corrida',
      duration: 30,
      intensity: 'moderado',
      completed: true,
    },
    {
      id: 2,
      name: 'Musculação - Peito',
      duration: 45,
      intensity: 'alto',
      completed: false,
    },
    {
      id: 3,
      name: 'Alongamento',
      duration: 15,
      intensity: 'leve',
      completed: false,
    },
  ],

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